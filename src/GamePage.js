// src/GamePage.js
import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import useTelegram from './useTelegram';

const GamePage = () => {
  const { username } = useParams();
  const tg = useTelegram();

  useEffect(() => {
    if (tg && tg.expand) {
      tg.expand();
    }

    // Redirect to the game URL with the username as a query parameter
    window.location.href = `https://ball.pooldegens.meme/bally4/index.html?username=${username}`;
  }, [username, tg]);

  return <div>Loading game...</div>;
};

export default GamePage;