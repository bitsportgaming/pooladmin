// src/components/Layout.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import axios from 'axios';
import useTelegram from './useTelegram';
import DollarIcon from './images/dollaricon.png';
import HomeIcon from './images/home-icon.png';
import FrensIcon from './images/frens-icon.png';
import PoolDegenLogo from './images/pooldegen.png'; // Import the logo
import WalletIcon from './images/wallet.png'; // Import the wallet icon

const LayoutWrapper = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #333;
  color: white;
`;

const HeaderCenter = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
`;

const Footer = styled.footer`
  display: flex;
  justify-content: space-around;
  padding: 1rem;
  background: #333;
  color: white;
  position: fixed;
  width: 100%;
  bottom: 0;
`;

const Main = styled.main`
  flex: 1;
`;

const IconWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
`;

const Icon = styled.img`
  width: 38px;  // Adjust size as needed
  height: 38px;  // Adjust size as needed
`;

const IconText = styled.span`
  margin-top: 0.5rem;
  font-family: 'Playfair Display', serif;  // Classy font
  font-size: 0.8rem;
  color: white;
`;

const Logo = styled.img`
  height: 40px;  // Adjust height as needed
  width: auto;  // Maintain aspect ratio
`;

const BalanceContainer = styled.div`
  display: flex;
  align-items: center;
  background: #444;
  padding: 0.5rem 1rem;
  border-radius: 5px;
  font-family: 'Playfair Display', serif;
  font-size: 1rem;
  color: white;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  margin: 0 1rem;
`;

const BalanceIcon = styled.img`
  width: 24px;
  height: 24px;
  margin-right: 0.5rem;
`;

const Wallet = styled.img`
  width: 38px;  // Adjust size as needed
  height: 38px;  // Adjust size as needed
`;

const Layout = ({ children }) => {
  const [score, setScore] = useState(0);
  const [username, setUsername] = useState('');
  const navigate = useNavigate();
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
    if (username) {
      const fetchScore = async () => {
        try {
          const response = await axios.get(`https://task.pooldegens.com/api/get_user_score?username=${username}`);
          setScore(response.data.score);
        } catch (error) {
          console.error('Error fetching score:', error);
        }
      };

      fetchScore();
    }
  }, [username]);

  const handleIconClick = (path) => {
    navigate(path);
  };

  return (
    <LayoutWrapper>
      <Header>
        <Logo src={PoolDegenLogo} alt="Pool Degen Logo" />
        <HeaderCenter>
          <BalanceContainer>
            <BalanceIcon src={DollarIcon} alt="Dollar Icon" />
            <span>$POOLD: {score}</span>
          </BalanceContainer>
          <Wallet src={WalletIcon} alt="Wallet Icon" />
        </HeaderCenter>
      </Header>
      <Main>{children}</Main>
      <Footer>
        <IconWrapper onClick={() => handleIconClick('/earn-hub')}>
          <Icon src={DollarIcon} alt="Dollar Icon" />
          <IconText>EARN</IconText>
        </IconWrapper>
        <IconWrapper onClick={() => handleIconClick('/select-game')}>
          <Icon src={HomeIcon} alt="Home Icon" />
          <IconText>HOME</IconText>
        </IconWrapper>
        <IconWrapper onClick={() => handleIconClick('/frens')}>
          <Icon src={FrensIcon} alt="Frens Icon" />
          <IconText>FRENS</IconText>
        </IconWrapper>
      </Footer>
    </LayoutWrapper>
  );
};

export default Layout;
