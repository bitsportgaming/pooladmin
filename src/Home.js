import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import useTelegram from "./useTelegram";
import MenuComponent from "./MenuComponent";
import "./Home.css";

const Home = () => {
  const navigate = useNavigate();
  const tg = useTelegram();
  const [score, setScore] = useState(0);
  const [username, setUsername] = useState("");

  const gameFrameRef = React.useRef(null);
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
      const fetchScore = async () => {
        try {
          const response = await axios.get(`https://app.pooldegens.com/api/get_user_score?username=${username}`);
          setScore(response.data.score);
        } catch (error) {
          console.error("Error fetching score:", error);
        }
      };

      fetchScore();
    }
  }, [username]);

  useEffect(() => {
    const handleMessage = async (event) => {
      if (event.data.type === "GAME_OVER" || event.data.type === "GAME_WIN") {
        const newScore = event.data.score;
        
        try {
          await axios.post("https://app.pooldegens.com/api/save_score", {
            username: username,
            score: newScore
          });
          console.log('Score submitted successfully');
        } catch (error) {
          console.error("Error submitting score:", error);
        }

        // Remove the iframe
        if (gameFrameRef.current) {
          document.body.removeChild(gameFrameRef.current);
        }

        // Reset body styles
        document.body.style.overflowY = '';
        document.body.style.marginTop = '';
        document.body.style.height = '';
        document.body.style.paddingBottom = '';

        // Redirect to home
        navigate("/home");
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [username, navigate]);

  const onDAvatarsClick = useCallback(() => {
    navigate("/profile");
  }, [navigate]);

  const onPlayPoolDegenClick = useCallback(() => {
    const gameUrl = `https://ball.pooldegens.meme/rule/index.html?username=${encodeURIComponent(username)}`;
    
    // Apply overflow handling
    const overflow = 100;
    document.body.style.overflowY = 'hidden';
    document.body.style.marginTop = `${overflow}px`;
    document.body.style.height = window.innerHeight + overflow + "px";
    document.body.style.paddingBottom = `${overflow}px`;
    window.scrollTo(0, overflow);

    // Open the game URL in an iframe
    const gameFrame = document.createElement('iframe');
    gameFrame.src = gameUrl;
    gameFrame.style.position = 'fixed';
    gameFrame.style.top = '0';
    gameFrame.style.left = '0';
    gameFrame.style.width = '100%';
    gameFrame.style.height = '100%';
    gameFrame.style.border = 'none';
    gameFrameRef.current = gameFrame;
    document.body.appendChild(gameFrame);

    // Add a function to remove the iframe when needed
    const removeGameFrame = () => {
      document.body.removeChild(gameFrame);
      // Reset body styles
      document.body.style.overflowY = '';
      document.body.style.marginTop = '';
      document.body.style.height = '';
      document.body.style.paddingBottom = '';
    };

    // You might want to add a close button or some other way to trigger removeGameFrame
  }, [username]);

  const onPlayPoolTapClick = useCallback(() => {
    navigate("/pooltap");
  }, [navigate]);

  return (
    <div className="home">
      <img className="background-icon" alt="" src="/background@2x.png" />
      <div className="coinholder">
        <b className="score">{score}</b>
        <img className="poold-01-1-icon" alt="" src="/poold01-1@2x.png" />
      </div>
      <img
        className="d-avatars-13"
        alt=""
        src="/3d-avatars--13@2x.png"
        onClick={onDAvatarsClick}
      />
      <div className="logo-intro">
        <img className="logo-icon" alt="" src="/logo@2x.png" />
        <div className="welcome">WELCOME</div>
        <div className="degens">DEGENS</div>
      </div>
      <div className="game-container">
        <div className="game-card" onClick={onPlayPoolDegenClick}>
          <img className="game-image" alt="" src="/frame-2@2x.png" />
          <div className="game-description">
            <h2 className="game-title">pooldegen</h2>
            <p className="game-text">
              Play Pool, score trickshots and earn while doing what you love to do the most.
            </p>
            <button className="play-button">Play PoolDegen</button>
          </div>
        </div>
        <div className="game-card" onClick={onPlayPoolTapClick}>
          <img className="game-image" alt="" src="/frame-3@2x.png" />
          <div className="game-description">
            <h2 className="game-title">PoolTAP</h2>
            <p className="game-text">
              Can't play Pool? No problem. Earn rewards by simply tapping to play.
            </p>
            <button className="play-button">Play PoolTap</button>
          </div>
        </div>
      </div>
      <MenuComponent />
    </div>
  );
};

export default Home;
