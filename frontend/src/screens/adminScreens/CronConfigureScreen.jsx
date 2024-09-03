import CronConfigure from "../../components/AdminComponents/CronConfigure";
import { useEffect, useState } from "react"
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useGetCronDataMutation, useGetTypesOfWorkOrderMutation } from "../../slices/adminApiSlice";
import Loader from "../../components/Loader";


const CronConfigureScreen = () => {
  const { cronId } = useParams();
  const [cronData, setCronData] = useState([]);
  const [cronDataFromAPI, { isLoading } ] = useGetCronDataMutation();

  const [typesOfWorkOrder, setTypesOfWorkOrder] = useState([]);
  const [typesOfWorkOrderFromAPI, { isLoadingTypesOfWorkOrder } ] = useGetTypesOfWorkOrderMutation();

  useEffect(() => {
    try {
      const fetchData = async () => {
        // Getting cron config detail
        const responseFromApiCall = await cronDataFromAPI(cronId);
        const cronArray = responseFromApiCall.data.cronData;
        setCronData(cronArray);

        // Getting types of work order
        const typesOfWorkOrderFromApiCall = await typesOfWorkOrderFromAPI();
        const typesOfWorkOrderArray = typesOfWorkOrderFromApiCall.data;
        setTypesOfWorkOrder(typesOfWorkOrderArray);
      };
  
      fetchData();
    } catch (err) {
      toast.error( err?.data?.errors[0]?.message || err );
      console.error("Error fetching crons:", err);
    }

  }, []);

  return (
    <div>
      <h1>Configure Cron</h1>
      { isLoading || isLoadingTypesOfWorkOrder ? <Loader/> : <CronConfigure cron={cronData} typesOfWorkOrder={typesOfWorkOrder} /> }
    </div>
  );
};

export default CronConfigureScreen;