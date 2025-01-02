import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import './ValidateTask.css';

const ValidateTask = () => {
  const [pendingTasks, setPendingTasks] = useState([]);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [tasksPerPage] = useState(12);

  const fetchPendingTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('https://app.pooldegens.com/api/get_pending_tasks');
      setPendingTasks(response.data);
      setError(null);
    } catch (error) {
      console.error("Error fetching pending tasks:", error);
      setError(`Failed to fetch pending tasks. ${error.response?.data?.details || error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingTasks();
  }, [fetchPendingTasks]);

  const handleTaskAction = async (task, action) => {
    try {
      await axios.post(`https://app.pooldegens.com/api/${action}_task`, {
        taskId: task.taskId,
        username: task.username
      });
      setPendingTasks((prevTasks) => prevTasks.filter(t => t.taskId !== task.taskId));
      setSelectedTasks((prev) => prev.filter(id => id !== task.taskId));
      setSuccessMessage(`Task ${action === 'approve' ? 'approved' : 'rejected'} successfully for user ${task.username}`);
      setTimeout(() => setSuccessMessage(null), 3000);

      // Check if the current page is now empty and adjust if necessary
      const remainingTasks = pendingTasks.length - 1;
      const maxPage = Math.ceil(remainingTasks / tasksPerPage);
      if (currentPage > maxPage && maxPage > 0) {
        setCurrentPage(maxPage);
      }
    } catch (error) {
      console.error(`Error ${action}ing task:`, error);
      setError(`Failed to ${action} task. Please try again.`);
    }
  };

  const handleApproveTask = (task) => handleTaskAction(task, 'approve');
  const handleRejectTask = (task) => handleTaskAction(task, 'reject');

  const handleBulkApprove = async () => {
    try {
      await axios.post('https://task.pooldegens.meme/api/bulk_approve_tasks', {
        tasks: selectedTasks
      });
      
      setPendingTasks((prevTasks) => prevTasks.filter(t => !selectedTasks.includes(t.taskId)));
      setSuccessMessage(`${selectedTasks.length} tasks approved successfully`);
      setSelectedTasks([]);
      setTimeout(() => setSuccessMessage(null), 3000);

      // Adjust current page if necessary
      const remainingTasks = pendingTasks.length - selectedTasks.length;
      const maxPage = Math.ceil(remainingTasks / tasksPerPage);
      if (currentPage > maxPage && maxPage > 0) {
        setCurrentPage(maxPage);
      }
    } catch (error) {
      console.error("Error bulk approving tasks:", error);
      setError(`Failed to bulk approve tasks. Please try again.`);
    }
  };

  const handleSelectTask = (taskId) => {
    setSelectedTasks(prev => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const openImageModal = (imageUrl) => {
    setSelectedImage(imageUrl);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
  };

  // Pagination
  const indexOfLastTask = currentPage * tasksPerPage;
  const indexOfFirstTask = indexOfLastTask - tasksPerPage;
  const currentTasks = pendingTasks.slice(indexOfFirstTask, indexOfLastTask);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="validate-task-page">
      <header className="page-header">
        <h1>Pending Tasks for Validation</h1>
        {error && <div className="error-message">{error}</div>}
        {successMessage && <div className="success-message">{successMessage}</div>}
      </header>

      {isLoading ? (
        <div className="loading">Loading pending tasks...</div>
      ) : (
        <>
          {selectedTasks.length > 0 && (
            <div className="bulk-actions">
              <button onClick={handleBulkApprove} className="bulk-approve-button">
                Approve Selected ({selectedTasks.length})
              </button>
            </div>
          )}
          <div className="task-grid">
            {currentTasks.length === 0 ? (
              <p className="no-tasks">No pending tasks for validation.</p>
            ) : (
              currentTasks.map((task) => (
                <div key={task.taskId} className={`task-card ${selectedTasks.includes(task.taskId) ? 'selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={selectedTasks.includes(task.taskId)}
                    onChange={() => handleSelectTask(task.taskId)}
                    className="task-checkbox"
                  />
                  <h3 className="task-description">{task.taskDescription}</h3>
                  <p className="task-username">Submitted by: {task.username}</p>
                  <div className="evidence-container">
                    <img 
                      src={task.evidenceUrl} 
                      alt="Task Evidence" 
                      className="evidence-thumbnail" 
                      onClick={() => openImageModal(task.evidenceUrl)}
                    />
                  </div>
                  <div className="task-actions">
                    <button onClick={() => handleApproveTask(task)} className="approve-button">Approve</button>
                    <button onClick={() => handleRejectTask(task)} className="reject-button">Reject</button>
                  </div>
                </div>
              ))
            )}
          </div>

          <Pagination
            tasksPerPage={tasksPerPage}
            totalTasks={pendingTasks.length}
            paginate={paginate}
            currentPage={currentPage}
          />
        </>
      )}

      {selectedImage && (
        <div className="image-modal" onClick={closeImageModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <img src={selectedImage} alt="Full size evidence" />
            <button className="close-modal" onClick={closeImageModal}>&times;</button>
          </div>
        </div>
      )}
    </div>
  );
};

const Pagination = ({ tasksPerPage, totalTasks, paginate, currentPage }) => {
  const pageNumbers = [];

  for (let i = 1; i <= Math.ceil(totalTasks / tasksPerPage); i++) {
    pageNumbers.push(i);
  }

  return (
    <nav>
      <ul className='pagination'>
        {pageNumbers.map(number => (
          <li key={number} className={`page-item ${currentPage === number ? 'active' : ''}`}>
            <a onClick={() => paginate(number)} href='#!' className='page-link'>
              {number}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default ValidateTask;
