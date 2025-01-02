import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from './Layout';
import styled, { keyframes } from 'styled-components';
import { TonConnectButton, useTonAddress } from '@tonconnect/ui-react';
import useTelegram from './useTelegram';
import WalletIcon from './images/wallet-icon.png'; // Ensure you have this icon in your project
import { FaSpinner } from 'react-icons/fa'; // Import the spinner icon

const Container = styled.div`
  padding: 2rem;
  background-color: #1a1a1a;
  color: white;
`;

const WelcomeText = styled.p`
  font-size: 1rem;
  font-family: 'Arial', sans-serif;
  margin-bottom: 1.5rem;
  color: #bbb;
`;

const TaskList = styled.ul`
  list-style: none;
  padding: 0;
`;

const TaskItem = styled.li`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  margin-bottom: 1rem;
  background: #2b2b2b;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.3s ease;

  &:hover {
    background: #3a3a3a;
  }

  ${(props) =>
    props.disabled &&
    `
    opacity: 0.5;
    cursor: not-allowed;
  `}
`;

const TaskInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const TaskName = styled.span`
  font-size: 1.2rem;
`;

const TaskPoints = styled.span`
  font-size: 1rem;
  color: #4caf50;
`;

const CustomTaskItem = styled.div`
  display: flex;
  align-items: center;
  padding: 1rem;
  margin-bottom: 1rem;
  background: #0077c8;
  border-radius: 12px;
  color: white;
  cursor: pointer;
`;

const CustomTaskIcon = styled.img`
  width: 40px;
  height: 40px;
  margin-right: 1rem;
`;

const CustomTaskText = styled.span`
  flex: 1;
  font-size: 1.2rem;
`;

const WalletAddress = styled.div`
  margin-top: 1rem;
  padding: 1rem;
  background: #2b2b2b;
  border-radius: 8px;
  text-align: center;
`;

const Modal = styled.div`
  background: #333;
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  margin-top: 2rem;
`;

const ModalTitle = styled.h2`
  font-size: 1.2rem;
  font-family: 'Playfair Display', serif;
  color: white;
  margin-bottom: 1rem;
`;

const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const LoadingIcon = styled(FaSpinner)`
  animation: ${spin} 2s linear infinite;
`;

const EarnHub = () => {
  const [tasks, setTasks] = useState([]);
  const [username, setUsername] = useState('');
  const [score, setScore] = useState(0); // Added score state
  const [loadingTaskId, setLoadingTaskId] = useState(null);
  const [walletConnected, setWalletConnected] = useState(false); // Added walletConnected state
  const [walletAddress, setWalletAddress] = useState(''); // Added walletAddress state
  const tg = useTelegram();

  const userFriendlyAddress = useTonAddress();

  useEffect(() => {
    if (tg) {
      tg.ready();
      const user = tg.initDataUnsafe.user;
      setUsername(user.username);
      console.log('Username:', user.username);
    }

    const fetchTasks = async () => {
      try {
        const response = await axios.get('https://task.pooldegens.com/api/get_earn_hub_tasks');
        setTasks(response.data);
      } catch (error) {
        console.error('Error fetching tasks:', error);
      }
    };

    fetchTasks();
  }, [tg]);

  useEffect(() => {
    const fetchScore = async () => {
      try {
        const response = await axios.get(`https://task.pooldegens.com/api/get_user_score?username=${username}`);
        setScore(response.data.score);
      } catch (error) {
        console.error('Error fetching score:', error);
      }
    };

    if (username) {
      fetchScore();
    }
  }, [username]);

  useEffect(() => {
    if (userFriendlyAddress) {
      setWalletConnected(true);
      setWalletAddress(userFriendlyAddress);
      // Save wallet address to database
      const saveWalletAddress = async () => {
        try {
          const response = await axios.post('https://task.pooldegens.com/api/save_wallet_address', {
            username,
            ton_wallet: userFriendlyAddress,
          });
          console.log('Wallet address saved:', response.data);
        } catch (error) {
          console.error('Error saving wallet address:', error);
        }
      };

      saveWalletAddress();
    }
  }, [userFriendlyAddress, username]);

  const handleTaskClick = async (taskId) => {
    if (!walletConnected) {
      alert('Please connect your TON wallet before completing tasks.');
      return;
    }

    setLoadingTaskId(taskId);
    setTimeout(async () => {
      const task = tasks.find(t => t._id === taskId);
      if (task && task.link) {
        window.open(task.link, '_blank');
      }

      try {
        await axios.post('https://task.pooldegens.com/api/complete_earn_hub_task', {
          username,
          task_id: taskId,
        });
        setTasks(tasks.filter(t => t._id !== taskId));
        const response = await axios.get(`https://task.pooldegens.com/api/get_user_score?username=${username}`);
        setScore(response.data.score);
      } catch (error) {
        console.error('Error completing task:', error);
      }

      setLoadingTaskId(null);
    }, 10000);
  };

  return (
    <Layout>
      <Container>
        <WelcomeText>
          Welcome {username} to Earn Hub. Complete the below tasks to maximize your earnings.
        </WelcomeText>
        <CustomTaskText>Connect TON wallet</CustomTaskText>
        <CustomTaskItem>
          <CustomTaskIcon src={WalletIcon} alt="Wallet Icon" />
          <TonConnectButton />
        </CustomTaskItem>
        {walletConnected && userFriendlyAddress && (
          <WalletAddress>
            <strong>Your Ton Wallet Address:</strong> <br />
            {userFriendlyAddress}
          </WalletAddress>
        )}
        <Modal>
          <ModalTitle>Other EarnHub Tasks</ModalTitle>
          <TaskList>
            {tasks.map((task) => (
              <TaskItem
                key={task._id}
                onClick={() => handleTaskClick(task._id)}
                disabled={loadingTaskId === task._id}
              >
                <TaskInfo>
                  <TaskName>{task.name}</TaskName>
                  <TaskPoints>{task.points} points</TaskPoints>
                </TaskInfo>
                {loadingTaskId === task._id && <LoadingIcon />}
              </TaskItem>
            ))}
          </TaskList>
        </Modal>
      </Container>
    </Layout>
  );
};

export default EarnHub;
