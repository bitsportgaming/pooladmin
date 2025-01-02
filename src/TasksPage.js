import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import useTelegram from "./useTelegram";
import MenuComponent from "./MenuComponent";
import "./TasksPage.css";

const TasksPage = () => {
  const navigate = useNavigate();
  const tg = useTelegram();
  const [score, setScore] = useState(0);
  const [username, setUsername] = useState("");
  const [tasks, setTasks] = useState([]);
  const [taskStates, setTaskStates] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [currentTask, setCurrentTask] = useState(null);
  const [evidence, setEvidence] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (tg) {
      tg.ready();
      const user = tg.initDataUnsafe.user;
      setUsername(user.username);
      console.log("Username:", user.username);
    }
  }, [tg]);

  useEffect(() => {
    if (username) {
      fetchScore();
      fetchTasks();
      fetchTaskStates();
    }
  }, [username]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);

    try {
      const [scoreResponse, tasksResponse, taskStatesResponse] = await Promise.all([
        axios.get(`https://app.pooldegens.com/api/get_user_score?username=${username}`),
        axios.get('https://app.pooldegens.com/api/get_tasks'),
        axios.get(`https://app.pooldegens.com/api/get_task_states?username=${username}`)
      ]);

      setScore(scoreResponse.data.score);
      setTasks(tasksResponse.data);

      const states = {};
      taskStatesResponse.data.taskStates.forEach(state => {
        states[state.task_id] = state.status;
      });
      setTaskStates(states);

      console.log("Refresh completed successfully");
    } catch (error) {
      console.error("Error during refresh:", error);
      setError("Failed to refresh data. Please try again.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchScore = async () => {
    try {
      const response = await axios.get(`https://app.pooldegens.com/api/get_user_score?username=${username}`);
      setScore(response.data.score);
    } catch (error) {
      console.error("Error fetching score:", error);
      setError("Failed to fetch score. Please try again.");
    }
  };

  const fetchTasks = async () => {
    try {
      const response = await axios.get('https://app.pooldegens.com/api/get_tasks');
      setTasks(response.data);
      console.log("Fetched tasks:", response.data);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      setError("Failed to fetch tasks. Please try again.");
    }
  };

  const fetchTaskStates = async () => {
    try {
      const response = await axios.get(`https://app.pooldegens.com/api/get_task_states?username=${username}`);
      const states = {};
      response.data.taskStates.forEach(state => {
        states[state.task_id] = state.status;
      });
      setTaskStates(states);
    } catch (error) {
      console.error("Error fetching task states:", error);
      setError("Failed to fetch task states. Please try again.");
    }
  };

  const openTaskLink = (task) => {
    console.log("Task object:", task);
    console.log("Opening task link:", task.link);
    
    if (task.link && task.link.trim() !== '') {
      window.open(task.link, '_blank', 'noopener,noreferrer');
      setTaskStates(prev => ({...prev, [task._id]: 'verify'}));
    } else {
      console.error("Invalid task link:", task.link);
      setError("This task doesn't have a valid link.");
    }
  };

  const handleVerifyClick = (task) => {
    setCurrentTask(task);
    setShowModal(true);
  };

  const handleFileChange = (event) => {
    setEvidence(event.target.files[0]);
  };

  const handleSubmitEvidence = async () => {
    if (!evidence) {
      alert("Please select a file to upload.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('image', evidence);

    try {
      // Upload image to Imgur
      const imgurResponse = await axios.post('https://api.imgur.com/3/image', formData, {
        headers: { 
          'Authorization': 'Client-ID b1b3d4cf9f5e903'
        }
      });

      const evidenceUrl = imgurResponse.data.data.link;

      // Send task completion request to our server
      const response = await axios.post('https://app.pooldegens.com/api/complete_task', {
        username,
        task_id: currentTask._id,
        evidence_url: evidenceUrl
      });

      console.log("Upload response:", response.data);
      setTaskStates(prev => ({...prev, [currentTask._id]: 'validating'}));
      setShowModal(false);
      setEvidence(null);
      setCurrentTask(null);
      alert("Evidence submitted successfully!");
    } catch (error) {
      console.error("Error completing task:", error);
      setError("Failed to submit evidence. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaimReward = async (taskId, taskScore) => {
    try {
      await axios.post('https://app.pooldegens.com/api/claim_reward', {
        username,
        task_id: taskId,
        score: taskScore
      });
      fetchScore();
      setTaskStates(prev => ({...prev, [taskId]: 'claimed'}));
      // After claiming, refetch tasks to update the list
      fetchTasks();
    } catch (error) {
      console.error("Error claiming reward:", error);
      setError("Failed to claim reward. Please try again.");
    }
  };

  const getTaskStatus = (task) => {
    const status = taskStates[task._id];
    if (status === 'validating') return "Validating";
    if (status === 'approved') return "Claim";
    if (status === 'claimed') return "Claimed";
    if (status === 'verify') return "Verify";
    return "Start";
  };

  const handleButtonClick = (task) => {
    const status = getTaskStatus(task);
    console.log("Button clicked for task:", task, "Status:", status);
    if (status === "Start") {
      openTaskLink(task);
    } else if (status === "Verify") {
      handleVerifyClick(task);
    } else if (status === "Claim") {
      handleClaimReward(task._id, task.score);
    }
  };

  const onHOMEContainerClick = useCallback(() => {
    navigate("/home");
  }, [navigate]);

  const onEARNContainerClick = useCallback(() => {
    navigate("/earn");
  }, [navigate]);

  const onWALLETContainerClick = useCallback(() => {
    navigate("/wallet");
  }, [navigate]);

  const onFRENSContainerClick = useCallback(() => {
    navigate("/frens");
  }, [navigate]);

  return (
    <div className="tasks-page">
      <img className="background-icon2" alt="" src="/background@2x.png" />
      <div className="tasks-section">
        <div className="task">Task</div>
        <div className="earn-rewards-and">
          Earn rewards and game points by performing the following task
        </div>
        {error && <div className="error-message">{error}</div>}
        <div className="task-list">
          {tasks
            .filter(task => getTaskStatus(task) !== "Claimed")
            .map((task) => (
              <div key={task._id} className="invite">
                <div className="task1" onClick={() => openTaskLink(task)} style={{cursor: 'pointer'}}>
                  <img 
                    className="task-child" 
                    alt="" 
                    src={task.icon}
                    onError={(e) => {
                      console.error(`Failed to load image: ${task.icon}`);
                      e.target.src = '/fallback-image.png';
                    }}
                  />
                  <div className="invite-5-frens-parent">
                    <div className="invite-5-frens">{task.description}</div>
                    <div className="poold">+{task.score} $POOLD</div>
                  </div>
                </div>
                <div 
                  className="button" 
                  onClick={() => handleButtonClick(task)}
                >
                  <div className="start">{getTaskStatus(task)}</div>
                </div>
              </div>
            ))}
        </div>
      </div>
      <div className="game-balance-section">
        <div className="game-balance-frame">
          <div className="frame-parent">
            <div className="frame-group">
              <div className="ellipse-parent">
                <img className="frame-child" alt="" src="/ellipse-1@2x.png" />
                <div className="start">{username}</div>
              </div>
              <img 
                className={`refresh-icon1 ${isRefreshing ? 'rotating' : ''}`} 
                alt="Refresh" 
                src="/refresh1.svg" 
                onClick={handleRefresh}
                style={{ cursor: 'pointer' }}
              />
            </div>
            <div className="frame-container">
              <div className="poold-01-1-group">
                <img
                  className="poold-01-1-icon2"
                  alt=""
                  src="/poold01-11@2x.png"
                />
                <div className="div1">{score}</div>
              </div>
              <b className="game-balance2">GAME BALANCE</b>
            </div>
          </div>
        </div>
        <img className="logo-icon2" alt="" src="/logo2@2x.png" />
      </div>
    <MenuComponent />
      
      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>Upload Evidence</h2>
            <p>Please upload a screenshot of the action performed.</p>
            <input type="file" accept="image/*" onChange={handleFileChange} />
            {isLoading ? (
              <p>Uploading...</p>
            ) : (
              <>
                <button onClick={handleSubmitEvidence} disabled={!evidence}>Submit</button>
                <button onClick={() => setShowModal(false)}>Cancel</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TasksPage;