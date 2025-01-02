// src/ConnectTon.js
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { TonConnectUIProvider, TonConnectButton, useTonAddress } from '@tonconnect/ui-react';
import useTelegram from './useTelegram';

const Container = styled.div`
  padding: 2rem;
  background-color: #1a1a1a;
  color: white;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const Title = styled.h1`
  font-size: 1.5rem;
  font-family: 'Arial', sans-serif;
  margin-bottom: 2rem;
  color: #bbb;
  text-align: center;
`;

const WalletAddress = styled.div`
  margin-top: 1rem;
  padding: 1rem;
  background: #2b2b2b;
  border-radius: 8px;
  text-align: center;
  color: white;
`;

const Button = styled.button`
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  &:hover {
    background: #45a049;
  }
`;

const ConnectTon = () => {
  const tg = useTelegram();
  const userFriendlyAddress = useTonAddress();
  const rawAddress = useTonAddress(false);
  const [username, setUsername] = useState('');

  useEffect(() => {
    if (tg) {
      tg.ready();
      const user = tg.initDataUnsafe.user;
      setUsername(user.username);
    }
  }, [tg]);

  useEffect(() => {
    if (userFriendlyAddress && username) {
      const saveWallet = async () => {
        try {
          await fetch('https://task.pooldegens.meme/api/save_ton_wallet', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, ton_wallet: userFriendlyAddress }),
          });
        } catch (error) {
          console.error('Error saving TON wallet:', error);
        }
      };

      saveWallet();
    }
  }, [userFriendlyAddress, username]);

  return (
    <TonConnectUIProvider manifestUrl="https://task.pooldegens.meme/tonconnect-manifest.json">
      <Container>
        <Title>Click the button below to connect your TON wallet.</Title>
        <TonConnectButton />
        {userFriendlyAddress && (
          <WalletAddress>
            <strong>Your TON Wallet Address:</strong> <br />
            {userFriendlyAddress}
          </WalletAddress>
        )}
        {userFriendlyAddress && (
          <Button onClick={() => window.location.href = 'https://t.me/pooldegen_bot?start=wallet'}>
            Go back to Bot
          </Button>
        )}
      </Container>
    </TonConnectUIProvider>
  );
};

export default ConnectTon;
