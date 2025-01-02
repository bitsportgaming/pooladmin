import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import styled from 'styled-components';

const UserCountWrapper = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    background-color: #282c34;
    color: white;
`;

const CountDisplay = styled.div`
    font-size: 10rem;
    color: #61dafb;
`;

const ErrorMessage = styled.div`
    color: #ff6b6b;
    font-size: 1.5rem;
    margin-top: 1rem;
`;

const StatusMessage = styled.div`
    color: #4caf50;
    font-size: 1rem;
    margin-top: 0.5rem;
`;

const ShowUsers = () => {
    const [userCount, setUserCount] = useState(0);
    const [error, setError] = useState(null);
    const [status, setStatus] = useState('Connecting...');

    useEffect(() => {
        console.log('Attempting to connect to socket...');
        const socket = io('https://task.pooldegens.meme', {
            path: '/api/socket.io',
            transports: ['websocket'],
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            timeout: 10000, // 10 seconds timeout
        });

        socket.on('connect', () => {
            console.log('Socket connected successfully');
            setError(null);
            setStatus('Connected');
        });

        socket.on('connect_error', (err) => {
            console.error('Socket connection error: ', err);
            setError(`Connection error: ${err.message}. Real-time updates may be unavailable.`);
            setStatus('Disconnected');
        });

        socket.on('update_user_count', (count) => {
            console.log('Received user count update:', count);
            setUserCount(count);
        });

        socket.on('disconnect', (reason) => {
            console.log('Socket disconnected. Reason:', reason);
            setStatus(`Disconnected: ${reason}`);
        });

        socket.on('reconnect', (attemptNumber) => {
            console.log('Reconnected on attempt: ', attemptNumber);
            setStatus('Reconnected');
        });

        socket.on('reconnect_error', (error) => {
            console.error('Reconnection error: ', error);
            setError(`Failed to reconnect: ${error.message}. Please refresh the page.`);
            setStatus('Reconnection failed');
        });

        // Initial fetch of user count
        console.log('Fetching initial user count...');
        fetch('https://task.pooldegens.meme/api/user_count')
            .then(response => response.json())
            .then(data => {
                console.log('Initial user count:', data.count);
                setUserCount(data.count);
            })
            .catch(err => {
                console.error('Error fetching initial user count:', err);
                setError(`Failed to fetch initial user count: ${err.message}`);
            });

        return () => {
            console.log('Cleaning up socket connection...');
            socket.off('update_user_count');
            socket.off('connect');
            socket.off('connect_error');
            socket.off('disconnect');
            socket.off('reconnect');
            socket.off('reconnect_error');
            socket.disconnect();
        };
    }, []);

    return (
        <UserCountWrapper>
            <CountDisplay>{userCount.toLocaleString()}</CountDisplay>
            <StatusMessage>{status}</StatusMessage>
            {error && <ErrorMessage>{error}</ErrorMessage>}
        </UserCountWrapper>
    );
};

export default ShowUsers;