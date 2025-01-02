import React from 'react';
import { useLocation } from 'react-router-dom';

const WinLossPage = () => {
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const score = queryParams.get('score');
    const isWon = queryParams.get('isWon') === 'true';

    return (
        <div style={{ textAlign: 'center', padding: '50px' }}>
            <h1>{isWon ? 'Congratulations, You Won!' : 'Game Over, You Lost!'}</h1>
            <p>Your Score: {score}</p>
        </div>
    );
};

export default WinLossPage;