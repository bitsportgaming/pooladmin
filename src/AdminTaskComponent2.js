import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminTaskComponent.css';

const AdminTaskComponent2 = () => {
    const [tasks, setTasks] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [taskId, setTaskId] = useState(null);
    const [name, setName] = useState('');
    const [link, setLink] = useState('');
    const [points, setPoints] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [feedback, setFeedback] = useState('');

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        try {
            const response = await axios.get('https://task.pooldegens.meme/api/get_tasks2');
            setTasks(response.data);
        } catch (error) {
            console.error('Error fetching tasks:', error);
        }
    };

    const handleDelete = async (taskId) => {
        try {
            await axios.delete(`https://task.pooldegens.meme/api/delete_task2/${taskId}`);
            fetchTasks();
        } catch (error) {
            console.error('Error deleting task:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editMode) {
                await axios.put(`https://task.pooldegens.meme/api/edit_task2/${taskId}`, {
                    name,
                    link,
                    points,
                    expiry_date: expiryDate
                });
                alert('Task updated successfully');
            } else {
                await axios.post('https://task.pooldegens.meme/api/add_task2', {
                    name,
                    link,
                    points,
                    expiry_date: expiryDate
                });
                alert('Task added successfully');
            }
            fetchTasks();
            setShowForm(false);
            setEditMode(false);
            setName('');
            setLink('');
            setPoints('');
            setExpiryDate('');
        } catch (error) {
            console.error('Error adding/updating task:', error);
            alert('Failed to add/update task');
        }
    };

    const handleEdit = (task) => {
        setTaskId(task._id);
        setName(task.name);
        setLink(task.link);
        setPoints(task.points);
        setExpiryDate(task.expiry_date);
        setShowForm(true);
        setEditMode(true);
    };

    const handleFeedbackSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('https://task.pooldegens.meme/api/report_issue', {
                feedback
            });
            alert(response.data.message);
            setShowModal(false);
            setFeedback('');
        } catch (error) {
            console.error('Error submitting feedback:', error);
            alert('Failed to submit feedback');
        }
    };

    return (
        <div className="admin-container">
            <h2>Admin Task Management</h2>
            <button onClick={() => setShowForm(!showForm)}>{showForm ? 'Close Form' : 'Create Task'}</button>
            <button onClick={() => setShowModal(true)}>Report an Issue</button>
            {showForm && (
                <form onSubmit={handleSubmit} className="task-form">
                    <div>
                        <label>Task Name:</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
                    </div>
                    <div>
                        <label>Task Link:</label>
                        <input type="text" value={link} onChange={(e) => setLink(e.target.value)} required />
                    </div>
                    <div>
                        <label>Task Points:</label>
                        <input type="number" value={points} onChange={(e) => setPoints(e.target.value)} required />
                    </div>
                    <div>
                        <label>Expiry Date:</label>
                        <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} required />
                    </div>
                    <button type="submit">{editMode ? 'Update Task' : 'Add Task'}</button>
                </form>
            )}
            <ul className="task-list">
                {tasks.map(task => (
                    <li key={task._id} className="task-item">
                        <span>{task.name}</span>
                        <button onClick={() => handleEdit(task)}>Edit</button>
                        <button onClick={() => handleDelete(task._id)}>Delete</button>
                    </li>
                ))}
            </ul>
            {showModal && (
                <div className="modal">
                    <div className="modal-content">
                        <span className="close" onClick={() => setShowModal(false)}>&times;</span>
                        <form onSubmit={handleFeedbackSubmit}>
                            <div>
                                <label>Feedback:</label>
                                <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} required />
                            </div>
                            <button type="submit">Submit Feedback</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminTaskComponent2;
