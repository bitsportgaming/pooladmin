import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import useTelegram from "./useTelegram";
import "./Home.css";

const Home = () => {
  const navigate = useNavigate();
  const tg = useTelegram();
  const [score, setScore] = useState(0);
  const [username, setUsername] = useState("");

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
          const response = await axios.get(`https://task.pooldegens.meme/api/get_user_score?username=${username}`);
          setScore(response.data.score);
        } catch (error) {
          console.error("Error fetching score:", error);
        }
      };

      fetchScore();
    }
  }, [username]);

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

  const onDAvatarsClick = useCallback(() => {
    navigate("/profile");
  }, [navigate]);

  const onPlayBT2ContainerClick = useCallback(() => {
    if (tg && tg.disableVerticalSwipes) {
      tg.disableVerticalSwipes();
    }
    const gameUrl = `https://ball.pooldegens.meme/index.html?username=${encodeURIComponent(username)}`;
    if (tg && tg.openLink) {
      tg.openLink(gameUrl);
    } else {
      window.open(gameUrl, '_blank');
    }
  }, [username, tg]);

  const onPlayBT1ContainerClick = useCallback(() => {
    navigate("/pooltap");
  }, [navigate]);

  return (
    <div className="home">
      <img className="background-icon" alt="" src="/background@2x.png" />
      <div className="navbar">
        <div className="home1" onClick={onHOMEContainerClick}>
          <b className="home2">HOME</b>
          <img className="home-child" alt="" src="/group-1554.svg" />
          <img
            className="game-shop-purple"
            alt=""
            src="/game-shop-purple.svg"
          />
        </div>
        <div className="earn" onClick={onEARNContainerClick}>
          <b className="earn1">EARN</b>
          <img className="earn-child" alt="" src="/group-850.svg" />
        </div>
        <div className="wallet" onClick={onWALLETContainerClick}>
          <b className="wallet1">WALLET</b>
          <img className="wallet-child" alt="" src="/group-1536.svg" />
        </div>
        <div className="frens" onClick={onFRENSContainerClick}>
          <b className="frens1">FRENS</b>
          <img className="luck-pirple-icon" alt="" src="/luck-pirple.svg" />
        </div>
      </div>
      <div className="coinholder">
        <img className="coinholder-child" alt="" src="/group-19.svg" />
        <b className="b">{score}</b>
        <img className="poold-01-1-icon" alt="" src="/poold01-1@2x.png" />
      </div>
      <img
        className="d-avatars-13"
        alt=""
        src="/3d-avatars--13@2x.png"
        onClick={onDAvatarsClick}
      />
      <div className="play-bt2" onClick={onPlayBT2ContainerClick}>
        <b className="play-pooldegens">
          <p className="play">PLAY</p>
          <p className="pooldegens">POOLDEGENS</p>
        </b>
        <img className="arrow-forward-icon" alt="" src="/arrow-forward.svg" />
        <img className="play-bt2-child" alt="" src="/frame-2@2x.png" />
      </div>
      <div className="play-bt1" onClick={onPlayBT1ContainerClick}>
        <b className="play-pooldegens">
          <p className="play">PLAY</p>
          <p className="pooldegens">POOLTAP</p>
        </b>
        <img className="arrow-forward-icon1" alt="" src="/arrow-forward.svg" />
        <img className="play-bt1-child" alt="" src="/frame-3@2x.png" />
      </div>
      <div className="logo-intro">
        <img className="logo-icon" alt="" src="/logo@2x.png" />
        <div className="welcome">WELCOME</div>
        <div className="degens">DEGENS</div>
      </div>
    </div>
  );
};

export default Home;
