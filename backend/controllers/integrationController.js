// ===================================================== Integration Controller =====================================================

import asyncHandler from "express-async-handler";
import { makeRequest } from "../utils/makeRequest.js";
import Integration from "../models/integrationModel.js";
import IntegrationService from '../services/integrationService.js';
import moment from 'moment-timezone';
import { NotFoundError, InternalServerError } from '@emtiaj/custom-errors';


/*
   # Desc: Connect an account with field nation
   # Route: POST /api/v1/integration/connect-account
   # Access: PRIVATE
  */
const connectAccount = asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    const integrationService = new IntegrationService(req.user.userId);
    const url = `${process.env.FN_BASE_URL}/authentication/api/oauth/token`;
    const data = new URLSearchParams({
        username,
        password,
        grant_type: 'password',
        client_id: process.env.FN_AUTHENTICATE_CLIENT_ID,
        client_secret: process.env.FN_AUTHENTICATE_CLIENT_SECRET,
    });
    const headers = {};

    try {
        const result = await makeRequest('POST', url, headers, data, {}, req.user.userId);

        if (result && result.access_token) {
            const { id: fnUserId } = result.user;
            let integration = await Integration.findOne({ userId: req.user.userId });
            if (integration) {
                // Update existing integration
                integration.fnUserId = fnUserId;
                integration.fnUserName = username;
                integration.lastConnectedAt = moment.utc().toDate();
                integration.integrationStatus = 'Connected';
            } else {
                // Create new integration
                integration = new Integration({
                    userId: req.user.userId,  // assuming you're attaching the logged-in user
                    fnUserId,
                    fnUserName: username,
                    lastConnectedAt: moment.utc().toDate(),
                    integrationStatus: 'Connected',
                });
            }
            if (req.user && req.user.isAdmin) {
                integration.fnAccessToken = result.access_token;
                integration.fnRefreshToken = result.refresh_token;
            }
            integration = await integration.save();
            let lastTimeRefreshTokenGeneratedAt = '';
            if (integration && integration.lastConnectedAt) {
                const lastConnectedAt = integration.lastConnectedAt;
                const currentDate = moment.utc();

                const differenceInDays = currentDate.diff(lastConnectedAt, 'days');
                lastTimeRefreshTokenGeneratedAt = `${differenceInDays} ${differenceInDays > 1 ? 'days' : 'day'} ago`;
            }
            res.status(200).json({ ...integration.toObject(), lastTimeRefreshTokenGeneratedAt });
        } else {
            await integrationService.updateIntegrationStatus(false);
            throw new NotFoundError("Not found access token.");
        }
    } catch (error) {
        await integrationService.updateIntegrationStatus(false);
        throw new InternalServerError("Failed t connect account.");
    }
});


/*
   # Desc: Get integration detail by userId
   # Route: GET /api/v1/integration/:id
   # Access: PRIVATE
  */
const getIntegrationInfoByUserId = asyncHandler(async (req, res) => {
    const integrationInfo = await Integration.findOne({ userId: req.params.id });
    let lastTimeRefreshTokenGeneratedAt = '';
    if (integrationInfo && integrationInfo.lastConnectedAt) {
        const lastConnectedAt = integrationInfo.lastConnectedAt;
        const currentDate = moment.utc();

        const differenceInDays = currentDate.diff(lastConnectedAt, 'days');
        lastTimeRefreshTokenGeneratedAt = `${differenceInDays} ${differenceInDays > 1 ? 'days' : 'day'} ago`;
    }
    try {
        if (integrationInfo) {
            res.status(200).json({ ...integrationInfo.toObject(), lastTimeRefreshTokenGeneratedAt });
        } else {
            throw new NotFoundError("Integration information not found.");
        }
    } catch (error) {
        throw new InternalServerError("Failed to get integration info.");
    }
});


/*
   # Desc: Refresh/reconnect with Field Nation
   # Route: POST /api/v1/integration/refresh-connection/:id
   # Access: PRIVATE
  */
const refreshConnection = asyncHandler(async (req, res) => {
    const integrationInfo = await Integration.findOne({ userId: req.params.id });
    const integrationService = new IntegrationService(userId);
    if (!integrationInfo.fnRefreshToken) {
        throw new NotFoundError("Failed to retrieve existing refresh token.");
    }
    const url = `${process.env.FN_BASE_URL}/authentication/api/oauth/refresh`;
    const data = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.FN_AUTHENTICATE_CLIENT_ID,
        client_secret: process.env.FN_AUTHENTICATE_CLIENT_SECRET,
        refresh_token: integrationInfo.fnRefreshToken,
    });
    const headers = {};

    try {
        const result = await makeRequest('POST', url, headers, data, {}, req.user.userId);

        if (result && result.access_token) {
            const { id: fnUserId } = result.user;
            let integration = await Integration.findOne({ fnUserId });
            if (integration) {
                // Update existing integration
                integration.fnAccessToken = result.access_token;
                integration.integrationStatus = 'Connected';
            }
            await integration.save();
            res.status(200).json(integration);
        } else {
            await integrationService.updateIntegrationStatus(false);
            throw new InternalServerError("Failed to retrieve access token.");
        }
    } catch (error) {
        await integrationService.updateIntegrationStatus(false);
        throw new InternalServerError("Failed to re-connect account.");
    }
});

export {
    connectAccount,
    getIntegrationInfoByUserId,
    refreshConnection,
};