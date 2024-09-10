import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Button, Table, Modal, Badge, Form as BootstrapForm } from 'react-bootstrap';
import { useAddCronMutation, useDeleteCronMutation } from '../../slices/commonApiSlice';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import Select from 'react-select';

const CronsDataTable = ({ crons, typesOfWorkOrder }) => {
  const [addCron] = useAddCronMutation();
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [workOrderTypeOptions, setWorkOrderTypeOptions] = useState([]);
  const [isFormValid, setIsFormValid] = useState(false);
  const [formData, setFormData] = useState({
    cronStartAt: '',
    cronEndAt: '',
    workingWindowStartAt: '',
    workingWindowEndAt: '',
    drivingRadius: '',
    status: '',
    centerZip: '',
  });

  const handleSearch = (event) => {
    setSearchQuery(event.target.value);
  };
  const handleAddClick = () => setShowAddModal(true);
  const handleClose = () => setShowAddModal(false);
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const allWorkOrderTypeOptions = typesOfWorkOrder.map((type) => ({
    value: type.fnTypeId.toString(), // Convert to string if necessary
    label: type.fnTypeName,
  }));

  const handleWorkOrderTypeChange = (selectedOptions) => {
    setWorkOrderTypeOptions(selectedOptions);
  };

  useEffect(() => {
    const isValid = formData.cronStartAt && formData.cronEndAt && 
                    formData.workingWindowStartAt && formData.workingWindowEndAt &&
                    formData.drivingRadius && formData.status && formData.centerZip &&
                    workOrderTypeOptions.length > 0;
    setIsFormValid(isValid);
  }, [formData, workOrderTypeOptions]);


  const formatDateForInput = (dateTime) => {
    return dateTime ? format(new Date(dateTime), "yyyy-MM-dd'T'HH:mm") : '';
  };

  const handleSaveChanges = async () => {
    const selectedFnTypeIds = workOrderTypeOptions.map(
      (workOrderType) => workOrderType.value,
    );
    try {
      // Prepare the data to be sent
      const data = {
        centerZip: formData.centerZip,
        cronStartAt: formData.cronStartAt,
        cronEndAt: formData.cronEndAt,
        workingWindowStartAt: formData.workingWindowStartAt,
        workingWindowEndAt: formData.workingWindowEndAt,
        drivingRadius: formData.drivingRadius,
        status: formData.status,
        typesOfWorkOrder: selectedFnTypeIds,
      };

        const response = await addCron(data).unwrap();

      // Handle success (e.g., show a toast message or refresh the data)
      toast.success('Cron added successfully');

      // Close the modal
      // setShowEditModal(false);
      window.location.reload();
    } catch (error) {
      // Handle error (e.g., show an error message)
      toast.error('Failed to add cron.');
    }
  };

  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [cronIdToDelete, setCronIdToDelete] = useState(null); // Track the user ID to delete
  const [deleteCron, { isDeleteLoading }] = useDeleteCronMutation();
  const handleDelete = async () => {
    try {
      const responseFromApiCall = await deleteCron({ cronId: cronIdToDelete });
      toast.success('Cron Deleted Successfully.');
      setCronIdToDelete(null);
      setShowDeleteConfirmation(false);
      window.location.reload();
    } catch (err) {
      toast.error(err?.data?.errors[0]?.message || err?.error);
    }
  };
  // const filteredCrons = crons;
  const filteredCrons = crons.filter((cron) =>
    cron.userDetails.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mt-3">
        <BootstrapForm>
          <BootstrapForm.Group
            controlId="exampleForm.ControlInput1"
            className="mb-0"
          >
            <BootstrapForm.Control
              style={{ width: '500px' }}
              value={searchQuery}
              type="text"
              placeholder="Search: Enter Provider Name........"
              onChange={handleSearch}
            />
          </BootstrapForm.Group>
        </BootstrapForm>

        <Button variant="primary" onClick={handleAddClick}>
          Add Cron +
        </Button>
      </div>

      <div style={{ marginTop: '20px' }}>
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>Cron Id</th>
              <th>Provider Name</th>
              <th className="text-center align-middle d-none d-md-table-cell">
                Driving Radius
              </th>
              <th>Total #WO</th>
              <th>Status</th>
              <th>Configure</th>
              <th>Delete</th>
            </tr>
          </thead>
          <tbody>
            {filteredCrons.map((cron, index) => (
              <tr key={index}>
                <td>{cron.cronId}</td>
                <td>{cron?.userDetails?.name}</td>
                <td className="text-center align-middle d-none d-md-table-cell">
                  {cron.drivingRadius}
                </td>
                <td>{cron.totalRequested}</td>
                <td>
                  <Badge
                    bg={cron.status === 'active' ? 'success' : 'secondary'}
                  >
                    {cron.status}
                  </Badge>
                </td>
                <td>
                  <Link to={`/crons/configure-cron/${cron.cronId}`}>
                    <Button type="button" variant="primary" className="mt-3">
                      Configure
                    </Button>
                  </Link>
                </td>
                <td>
                  <Button
                    type="button"
                    variant={'danger'}
                    size="sm"
                    className="mt-3"
                    onClick={() => {
                      setCronIdToDelete(cron._id);
                      setShowDeleteConfirmation(true);
                    }}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
      <Modal show={showAddModal} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Edit Cron Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <BootstrapForm>
            <BootstrapForm.Group controlId="cronStartAt">
              <BootstrapForm.Label>Cron Start At</BootstrapForm.Label>
              <BootstrapForm.Control
                type="datetime-local"
                name="cronStartAt"
                value={formatDateForInput(formData.cronStartAt)}
                onChange={handleChange}
                required
              />
            </BootstrapForm.Group>
            <BootstrapForm.Group controlId="cronEndAt">
              <BootstrapForm.Label>Cron End At</BootstrapForm.Label>
              <BootstrapForm.Control
                type="datetime-local"
                name="cronEndAt"
                value={formatDateForInput(formData.cronEndAt)}
                onChange={handleChange}
                required
              />
            </BootstrapForm.Group>
            <BootstrapForm.Group controlId="workingWindowStartAt">
              <BootstrapForm.Label>Working Window Start At</BootstrapForm.Label>
              <BootstrapForm.Control
                type="time"
                name="workingWindowStartAt"
                value={formData.workingWindowStartAt}
                onChange={handleChange}
                required
              />
            </BootstrapForm.Group>
            <BootstrapForm.Group controlId="workingWindowEndAt">
              <BootstrapForm.Label>Working Window End At</BootstrapForm.Label>
              <BootstrapForm.Control
                type="time"
                name="workingWindowEndAt"
                value={formData.workingWindowEndAt}
                onChange={handleChange}
                required
              />
            </BootstrapForm.Group>
            <BootstrapForm.Group controlId="drivingRadius">
              <BootstrapForm.Label>Driving Radius</BootstrapForm.Label>
              <BootstrapForm.Control
                type="number"
                name="drivingRadius"
                value={formData.drivingRadius || ''}
                onChange={handleChange}
                required
              />
            </BootstrapForm.Group>
            <BootstrapForm.Group controlId="status">
              <BootstrapForm.Label>Status</BootstrapForm.Label>
              <BootstrapForm.Control
                as="select"
                name="status"
                value={formData.status || ''}
                onChange={handleChange}
                required
              >
                <option value="" disabled>
                  Select Status
                </option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </BootstrapForm.Control>
            </BootstrapForm.Group>

            <BootstrapForm.Group controlId="centerZip">
              <BootstrapForm.Label>Center Zip</BootstrapForm.Label>
              <BootstrapForm.Control
                type="text"
                name="centerZip"
                value={formData.centerZip || ''}
                onChange={handleChange}
                required
              />
            </BootstrapForm.Group>
            <BootstrapForm.Group controlId="workOrderTypes">
              <BootstrapForm.Label>Types of Work Order</BootstrapForm.Label>
              <Select
                value={workOrderTypeOptions}
                isMulti
                name="types_of_work_order"
                options={allWorkOrderTypeOptions}
                onChange={(selectedOptions) =>
                  handleWorkOrderTypeChange(selectedOptions)
                }
                className="basic-multi-select"
                classNamePrefix="select"
                required
              />
            </BootstrapForm.Group>
          </BootstrapForm>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
          <Button
            variant="primary"
            onClick={handleSaveChanges}
            disabled={!isFormValid}
          >
            Save
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <Modal
        show={showDeleteConfirmation}
        onHide={() => setShowDeleteConfirmation(false)}
        className="custom-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>Are you sure you want to delete this cron?</Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowDeleteConfirmation(false)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={isDeleteLoading}
          >
            {isDeleteLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default CronsDataTable;
