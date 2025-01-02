import React, { useState, useEffect } from 'react';
import axios from 'axios';
import useTelegram from './useTelegram';
import './TaskComponent.css';

const TaskComponent = () => {
    const [taskList, setTaskList] = useState([]);
    const [allTasksCompleted, setAllTasksCompleted] = useState(false);
    const [username, setUsername] = useState(null);
    const [loadingTaskId, setLoadingTaskId] = useState(null);
    const tg = useTelegram();

    useEffect(() => {
        if (tg) {
            tg.ready();
            const user = tg.initDataUnsafe.user;
            setUsername(user.username);
            console.log('Username:', user.username);
        }
    }, [tg]);

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const response = await axios.get('https://task.pooldegens.meme/api/get_tasks', {
                    params: { username: username }
                });
                if (Array.isArray(response.data)) {
                    const tasks = response.data.map(task => ({
                        id: task._id,
                        description: task.name,
                        actionUrl: task.link,
                        points: task.points,
                        completed: false
                    }));
                    setTaskList(tasks);
                } else {
                    setTaskList([]);
                    console.error('API response is not an array:', response.data);
                }
            } catch (error) {
                console.error('Error fetching tasks:', error);
            }
        };

        if (username) {
            fetchTasks();
        }
    }, [username]);

    useEffect(() => {
        const fetchCompletedTasks = async () => {
            try {
                const response = await axios.get('https://task.pooldegens.meme/api/get_completed_tasks', {
                    params: { username: username }
                });
                const completedTaskIds = response.data.completedTasks || [];
                const updatedTasks = taskList.map(task => ({
                    ...task,
                    completed: completedTaskIds.includes(task.id)
                }));
                setTaskList(updatedTasks.filter(task => !task.completed)); // Filter out completed tasks
                updatePlayButtonState(updatedTasks.filter(task => !task.completed)); // Update play button state based on updated tasks
            } catch (error) {
                console.error('Error fetching completed tasks:', error);
            }
        };

        if (username) {
            fetchCompletedTasks();
        }
    }, [username, taskList]);

    const handleTaskClick = (task) => {
        window.open(task.actionUrl, '_blank');
        setLoadingTaskId(task.id); // Set the loading task id
        setTimeout(async () => {
            const updatedTasks = taskList.map(t => t.id === task.id ? { ...t, completed: true } : t);
            setTaskList(updatedTasks.filter(t => !t.completed)); // Filter out completed tasks
            await saveTaskProgress(task.id, true);
            setLoadingTaskId(null); // Clear the loading task id
            updatePlayButtonState(updatedTasks.filter(t => !t.completed)); // Update the play button state after marking the task as completed
        }, 7000);
    };

    const updatePlayButtonState = (tasks) => {
        const allCompleted = tasks.length === 0; // All tasks are completed if the remaining task list is empty
        setAllTasksCompleted(allCompleted);
    };

    const handlePlayButtonClick = () => {
        const gameUrl = `https://ball.pooldegens.meme/roll10/index.html?username=${username}`;
        const iframe = document.getElementById('gameIframe');
        iframe.src = gameUrl;
        iframe.style.display = 'block';
        iframe.style.position = 'fixed';
        iframe.style.top = '0';
        iframe.style.left = '0';
        iframe.style.width = '100vw';
        iframe.style.height = '100vh';
        iframe.style.zIndex = '9999';
        iframe.style.border = 'none';
        iframe.style.borderRadius = '0';

        document.querySelector('.header').style.display = 'none';
        document.getElementById('tasks').style.display = 'none';
        document.getElementById('playGameButton').style.display = 'none';
    };

    const saveTaskProgress = async (taskId, completed) => {
        try {
            const response = await fetch('https://task.pooldegens.meme/api/complete_task', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username: username, task_id: taskId }),
            });
            const data = await response.json();
            console.log(data);
        } catch (error) {
            console.error('Error saving task progress:', error);
        }
    };

    return (
        <div className="container" style={{ backgroundColor: '#000', color: '#fff' }}>
            <div className="header">
                <img src="https://i.imgur.com/kYQwkot.png" alt="Pool Degen Banner" />
                <h1>Complete these tasks to start playing</h1>
                {username && <h2>Welcome, {username}!</h2>}
            </div>
            <ul id="tasks" className="tasks">
                {taskList.map(task => (
                    <li key={task.id} className={`task ${task.completed ? 'completed' : ''} ${loadingTaskId === task.id ? 'loading' : ''}`} onClick={() => handleTaskClick(task)}>
                        <label>{task.description}</label>
                        <span className="task-points">+{task.points}</span>
                        <div className={`icon ${task.completed ? 'check' : ''}`}></div>
                    </li>
                ))}
            </ul>
            {taskList.length === 0 && (
                <div className="no-tasks">
                    <p>There are currently no tasks to complete. Go farm some more $POOLD in the Game!</p>
                </div>
            )}
            <button id="playGameButton" disabled={!allTasksCompleted} onClick={handlePlayButtonClick}>Play Game</button>
            <iframe
                id="gameIframe"
                title="Game"
                style={{
                    display: 'none',
                    width: '100vw',
                    height: '100vh',
                    border: 'none',
                    borderRadius: '0',
                    marginTop: '0',
                    position: 'fixed',
                    top: '0',
                    left: '0',
                    zIndex: '9999'
                }}
            ></iframe>
        </div>
    );
};

export default TaskComponent;
