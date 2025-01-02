// src/components/GameSelector.js
import React from 'react';
import styled from 'styled-components';
import poolTapImg from './pooltap.png';
import poolDegenImg from './pooldegen.png';
import Layout from './Layout';

const GameSelectorWrapper = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 2rem;
`;

const GameBanner = styled.img`
    width: 70%;
    max-width: 300px;
    margin: 1rem;
    cursor: pointer;
    transition: transform 0.3s ease;
    &:hover {
        transform: scale(1.05);
    }
`;

const GameSelector = () => {
    return (
        <Layout>
            <GameSelectorWrapper>
                <GameBanner src={poolTapImg} alt="Pool Tap" onClick={() => window.location.href='https://ball.pooldegens.meme/pool-tap/'} />
                <GameBanner src={poolDegenImg} alt="Pool Degen" onClick={() => window.location.href='https://ball.pooldegens.meme/roll10/'} />
            </GameSelectorWrapper>
        </Layout>
    );
};

export default GameSelector;
