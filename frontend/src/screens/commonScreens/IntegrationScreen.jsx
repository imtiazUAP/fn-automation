import { useState, useEffect } from 'react';
import { Form, Button, Badge } from 'react-bootstrap';
import FormContainer from '../../components/FormContainer';
import { useDispatch, useSelector } from 'react-redux';
import {
  useIntegrateUserMutation,
  useIntegrationInfoByUserIdMutation,
} from '../../slices/userApiSlice';
import { toast } from 'react-toastify';
import Loader from '../../components/Loader';

const IntegrationScreen = () => {
  const [userId, setUserId] = useState(0);
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [integrationStatus, setIntegrationStatus] = useState('');
  const [lastTimeRefreshTokenGeneratedAt, setLastTimeRefreshTokenGeneratedAt] =
    useState('');

  const [
    getIntegrationInfoByUserId,
    { data: integrateUserInfo, isLoading: isLoadingIntegrationInfo },
  ] = useIntegrationInfoByUserIdMutation();

  const [integrateUser, { isLoading }] = useIntegrateUserMutation();
  const { userInfo } = useSelector((state) => state.auth);

  useEffect(() => {
    if (userInfo.userId) {
      setUserId(userInfo.userId);
      getIntegrationInfoByUserId(userInfo.userId);
    }
  }, [userInfo, getIntegrationInfoByUserId]);

  useEffect(() => {
    if (integrateUserInfo) {
      setUserName(integrateUserInfo.fnUserName || '');
      setIntegrationStatus(integrateUserInfo.integrationStatus || '');
      setLastTimeRefreshTokenGeneratedAt(
        integrateUserInfo.lastTimeRefreshTokenGeneratedAt || '',
      );
    }
  }, [integrateUserInfo]);

  const submitHandler = async (e) => {
    e.preventDefault();
    try {
      const data = {
        userId: userId,
        username: userName,
        password: password,
      };

      const result = await integrateUser(data).unwrap();
      setIntegrationStatus(result.integrationStatus || '');
      toast.success('Account connected successfully');
    } catch (err) {
      setIntegrationStatus('Not Connected');
      toast.error(err?.data?.message || err?.error);
    }
  };

  return (
    <FormContainer>
      <h3 style={{ margin: '5px auto 10px auto' }}>Connect to Field Nation</h3>
        <Badge
          pill
          bg={integrationStatus === 'Connected' ? 'success' : 'danger'}
          style={{ margin: '5px auto 10px auto' }}
        >
          {lastTimeRefreshTokenGeneratedAt && integrationStatus === 'Connected'
            ? integrationStatus + ': ' + lastTimeRefreshTokenGeneratedAt
            : integrationStatus ? integrationStatus : 'Not connected yet'}
        </Badge>

      <Form onSubmit={submitHandler}>
        <Form.Group className="my-2" controlId="userName">
          <Form.Label>Field Nation Username</Form.Label>
          <Form.Control
            type="text"
            placeholder="Enter name here..."
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
          />
        </Form.Group>

        <Form.Group className="my-2" controlId="password">
          <Form.Label>Field Nation Password</Form.Label>
          <Form.Control
            type="password"
            placeholder="Enter your field nation password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Form.Group>

        <Button type="submit" variant="primary" className="mt-3">
          Connect
        </Button>
      </Form>

      {(isLoading || isLoadingIntegrationInfo) && <Loader />}
    </FormContainer>
  );
};

export default IntegrationScreen;