import React, { useCallback, useState } from 'react';
import { useNavigate } from "react-router-dom";
import styles from './Page1.module.css';
import PoolTap from './PoolTap';

const Page1 = () => {
  const [xp, setXp] = useState(1490);
  const [poold, setPoold] = useState(70);
  const navigate = useNavigate();

  const onDAvatarsClick = useCallback(() => {
    navigate('/profile');
  }, [navigate]);

  const handleUpdateXP = (newXp) => {
    setXp(newXp);
  };

  const handleUpdatePoold = (newPoold) => {
    setPoold(newPoold);
  };

  const onHomeButtonClick = useCallback(() => {
    navigate("/home");
  }, [navigate]);

  return (
    <div className={styles.page2}>
      <img className={styles.backgroundIcon} alt="" src="/background@2x.png" />
      <div className={styles.coinholder}>
        <img className={styles.coinholderChild} alt="" src="/group-19.svg" />
        <b className={styles.b}>{poold}</b>
        <img className={styles.poold012Icon} alt="" src="/poold01-1@2x.png" />
      </div>
      <div className={styles.xpholder}>
        <b className={styles.b1}>{xp}</b>
        <div className={styles.xp}>XP</div>
      </div>
      <img
        className={styles.dAvatars13}
        alt=""
        src="/3d-avatars--13@2x.png"
        onClick={onDAvatarsClick}
      />
      <div className={styles.gameContainer}>
        <PoolTap onUpdateXP={handleUpdateXP} onUpdatePoold={handleUpdatePoold} />
      </div>
      <img
       className="home-button-icon"
        alt=""
        src="/home-button.svg"
        onClick={onHomeButtonClick}
      />
    </div>
  );
};

export default Page1;
