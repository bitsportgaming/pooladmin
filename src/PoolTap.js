import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './PoolTap.module.css';
import useTelegram from './useTelegram';

const balls = Array.from({ length: 15 }, (_, i) => ({
  id: i + 1,
  src: `/balls/ball${i + 1}.png`,
  points: i + 1,
}));
const badBall = { id: 16, src: '/balls/ballWhite.png', points: -20 };

const generateRandomPosition = () => {
  const x = Math.random() * 75 + 5; // 5% to 80% to keep it within the container bounds
  return { x };
};

const PoolTap = ({ onUpdateXP, onUpdatePoold }) => {
  const [activeBalls, setActiveBalls] = useState([]);
  const [xp, setXp] = useState(0);
  const [gameTime, setGameTime] = useState(120); // 2 minutes
  const [combo, setCombo] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [isExploding, setIsExploding] = useState(false);
  const [username, setUsername] = useState("");
  const navigate = useNavigate();
  const tg = useTelegram();
  const containerRef = useRef(null);
  const lastClickedBallRef = useRef(null);
  const isProcessingClickRef = useRef(false);

  useEffect(() => {
    if (tg) {
      tg.ready();
      const user = tg.initDataUnsafe?.user;
      if (user) {
        setUsername(user.username);
        console.log("Username:", user.username);
      } else {
        console.log("User data not available");
      }

      if (typeof tg.disableVerticalSwipes === 'function') {
        console.log("Disabling vertical swipes");
        tg.disableVerticalSwipes();
      } else {
        console.log("disableVerticalSwipes method not available");
      }

      return () => {
        if (typeof tg.enableVerticalSwipes === 'function') {
          console.log("Re-enabling vertical swipes");
          tg.enableVerticalSwipes();
        } else {
          console.log("enableVerticalSwipes method not available");
        }
      };
    }
  }, [tg]);

  const addBall = useCallback(() => {
    const random = Math.random();
    const ball = random < 0.1 ? badBall : balls[Math.floor(Math.random() * balls.length)];
    const position = generateRandomPosition();
    const newBall = { 
      ...ball, 
      position, 
      id: Date.now(),
      velocity: (Math.random() * 3 + 3) * 1.3,
      startTime: Date.now(),
      isFalling: false,
    };

    setActiveBalls((prevBalls) => [...prevBalls, newBall]);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (gameTime > 0) {
        setGameTime((prevTime) => prevTime - 1);
        for (let i = 0; i < 1.3; i++) {
          addBall();
        }
      } else {
        clearInterval(interval);
        endGame();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [addBall, gameTime]);

  const triggerHapticFeedback = (style) => {
    if (tg && tg.HapticFeedback) {
      tg.HapticFeedback.impactOccurred(style);
    }
  };

  const handleBallClick = useCallback((event, clickedBall) => {
    event.preventDefault();
    event.stopPropagation();

    if (isProcessingClickRef.current || lastClickedBallRef.current === clickedBall.id) {
      return;
    }

    isProcessingClickRef.current = true;
    lastClickedBallRef.current = clickedBall.id;

    console.log(`Ball clicked: ${clickedBall.id}`);

    if (clickedBall.points === -20) {
      triggerHapticFeedback('heavy');
      setIsExploding(true);
      setTimeout(() => {
        setActiveBalls([]);
        setCombo(0);
        setMultiplier(1);
        setIsExploding(false);
        isProcessingClickRef.current = false;
        lastClickedBallRef.current = null;
      }, 1000);
    } else {
      triggerHapticFeedback('light');
      const points = clickedBall.points * multiplier;
      setXp((prevXp) => prevXp + points);
      
      setActiveBalls((prevBalls) => {
        const newBalls = prevBalls.filter(ball => ball.id !== clickedBall.id);
        console.log(`Balls before: ${prevBalls.length}, Balls after: ${newBalls.length}`);
        return newBalls;
      });
      
      setCombo((prevCombo) => {
        const newCombo = prevCombo + 1;
        if (newCombo % 5 === 0) {
          setMultiplier((prevMultiplier) => Math.min(prevMultiplier + 0.5, 3));
        }
        return newCombo;
      });

      clearTimeout(window.comboResetTimer);
      window.comboResetTimer = setTimeout(() => {
        setCombo(0);
        setMultiplier(1);
      }, 2000);

      setTimeout(() => {
        isProcessingClickRef.current = false;
        lastClickedBallRef.current = null;
      }, 100);
    }
  }, [multiplier, triggerHapticFeedback]);

  const endGame = async () => {
    const pooldScore = Math.floor(xp / 200);
    if (username) {
      try {
        await axios.post('https://app.pooldegens.com/api/save_score', {
          username: username,
          score: pooldScore
        });
        console.log("Score saved successfully");
      } catch (error) {
        console.error('Error saving score:', error);
      }
    } else {
      console.error('Username not available, score not saved');
    }
    navigate('/gameover', { state: { score: pooldScore } });
  };

  useEffect(() => {
    onUpdateXP(xp);
    onUpdatePoold(Math.floor(xp / 200));
  }, [xp, onUpdateXP, onUpdatePoold]);

  useEffect(() => {
    const interval = setInterval(() => {
      const currentTime = Date.now();
      setActiveBalls((prevBalls) => {
        return prevBalls.map((ball) => {
          const elapsedTime = currentTime - ball.startTime;
          const animationDuration = 15000 / ball.velocity;
          if (elapsedTime >= animationDuration && !ball.isFalling) {
            return { ...ball, isFalling: true };
          }
          return ball;
        });
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.poolTap} ref={containerRef}>
      {activeBalls.map((ball) => (
        <div
          key={ball.id}
          className={`${styles.ballWrapper} ${ball.isFalling ? styles.falling : ''}`}
          style={{
            left: `${ball.position.x}%`,
            animationDuration: ball.isFalling ? '1s' : `${15 / ball.velocity}s`,
          }}
        >
          <img
            src={ball.src}
            alt={`ball-${ball.id}`}
            className={`${styles.ball} ${isExploding ? styles.exploding : ''}`}
            onTouchStart={(event) => handleBallClick(event, ball)}
            onClick={(event) => handleBallClick(event, ball)}
          />
        </div>
      ))}
      <div className={styles.gameInfo}>
        <span>Time: {gameTime}s</span>
        <span>XP: {xp}</span>
        <span>Multiplier: {multiplier.toFixed(1)}x</span>
      </div>
    </div>
  );
};

export default PoolTap;