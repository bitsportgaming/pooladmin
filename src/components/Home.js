import { useCallback } from "react";
import PropTypes from "prop-types";
import "./Home.css";

const Home = ({ className = "" }) => {
  const onHomeContainerClick = useCallback(() => {
    window.location.href = "/home";
  }, []);

  return (
    <div className={`home5 ${className}`} onClick={onHomeContainerClick}>
      <img className="game-shop-purple2" alt="" src="/game-shop-purple.svg" />
      <b className="home6">HOME</b>
    </div>
  );
};

Home.propTypes = {
  className: PropTypes.string,
};

export default Home;
