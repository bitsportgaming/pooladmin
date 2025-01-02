import React, { useState, useEffect } from "react";
import axios from "axios";
import "./TaskAdmin.css";

const TaskAdmin = () => {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState({ description: "", link: "", score: "", icon: "" });
  const [editingTaskId, setEditingTaskId] = useState(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await axios.get("https://task.pooldegens.meme/api/get_tasks");
      setTasks(response.data);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewTask({ ...newTask, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTaskId) {
        await axios.put(`https://task.pooldegens.meme/api/update_task/${editingTaskId}`, newTask);
      } else {
        await axios.post("https://task.pooldegens.meme/api/add_task", newTask);
      }
      fetchTasks();
      setNewTask({ description: "", link: "", score: "", icon: "" });
      setEditingTaskId(null);
    } catch (error) {
      console.error("Error adding/updating task:", error);
    }
  };

  const handleEdit = (task) => {
    setNewTask({
      description: task.description,
      link: task.link,
      score: task.score,
      icon: task.icon
    });
    setEditingTaskId(task._id);
  };

  const handleDelete = async (taskId) => {
    try {
      await axios.delete(`https://task.pooldegens.meme/api/delete_task/${taskId}`);
      fetchTasks();
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  return (
    <div className="task-admin-container">
      <h2>{editingTaskId ? "Edit Task" : "Add New Task"}</h2>
      <form onSubmit={handleSubmit} className="task-form">
        <div className="form-group">
          <label htmlFor="description">Task Description:</label>
          <input
            type="text"
            id="description"
            name="description"
            value={newTask.description}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="link">Task Link:</label>
          <input
            type="url"
            id="link"
            name="link"
            value={newTask.link}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="score">Task Score:</label>
          <input
            type="number"
            id="score"
            name="score"
            value={newTask.score}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="icon">Task Icon URL:</label>
          <input
            type="url"
            id="icon"
            name="icon"
            value={newTask.icon}
            onChange={handleInputChange}
            required
          />
        </div>
        {newTask.icon && (
          <div className="image-preview">
            <img src={newTask.icon} alt="Task Icon Preview" />
          </div>
        )}
        <div className="form-actions">
          <button type="submit" className="btn-primary">
            {editingTaskId ? "Update Task" : "Add Task"}
          </button>
          {editingTaskId && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setNewTask({ description: "", link: "", score: "", icon: "" });
                setEditingTaskId(null);
              }}
            >
              Cancel Edit
            </button>
          )}
        </div>
      </form>
      <div className="task-list">
        <h3>Existing Tasks</h3>
        {tasks.map((task) => (
          <div key={task._id} className="task-item">
            <img src={task.icon} alt={task.description} className="task-icon" />
            <div className="task-details">
              <h4>{task.description}</h4>
              <p>Link: {task.link}</p>
              <p>Score: {task.score}</p>
            </div>
            <div className="task-actions">
              <button onClick={() => handleEdit(task)} className="btn-secondary">Edit</button>
              <button onClick={() => handleDelete(task._id)} className="btn-secondary">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TaskAdmin;
