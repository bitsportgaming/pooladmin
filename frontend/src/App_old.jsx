// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import TaskComponent from './TaskComponent';
import WinLossPage from './WinLossPage';
import AdminTaskComponent from './AdminTaskComponent';
import AdminDashboard from './AdminDashboard';
import TaskComponent2 from './TaskComponent2';
import AdminTaskComponent2 from './AdminTaskComponent2';
import GameSelector from './GameSelector';
import ShowUsers from './ShowUsers';
import EarnHub from './EarnHub';
import EarnHubAdmin from './EarnHubAdmin';
import ConnectTon from './ConnectTon';
import Home from "./Home";
import GameOver from "./GameOver";
import TasksPage from "./TasksPage";
import Page1 from "./Page1";
import TaskAdmin from "./TaskAdmin";
import ValidateTask from "./ValidateTask";
import WalletPage from "./WalletPage";
import FrensPage from "./FrensPage";
import GamePage from "./GamePage"; // Import the new GamePage component

// Ensure the manifest URL is correctly set
const manifestUrl = "https://task.pooldegens.meme/tonconnect-manifest.json";

function App() {
  return (
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      <Router>
        <Routes>
          <Route path="/" element={<TaskComponent />} />
          <Route path="/game-result" element={<WinLossPage />} />
          <Route path="/admin" element={<AdminTaskComponent />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/task2" element={<TaskComponent2 />} />
          <Route path="/admin2" element={<AdminTaskComponent2 />} />
          <Route path="/select-game" element={<GameSelector />} />
          <Route path="/show-users" element={<ShowUsers />} />
          <Route path="/earn-hub" element={<EarnHub />} />
          <Route path="/earn-hub-admin" element={<EarnHubAdmin />} />
          <Route path="/connect-ton" element={<ConnectTon />} />
          <Route path="/home" element={<Home />} />
          <Route path="/gameover" element={<GameOver />} />
          <Route path="/earn" element={<TasksPage />} />
          <Route path="/pooltap" element={<Page1 />} />
          <Route path="/task-admin" element={<TaskAdmin />} />
          <Route path="/validate-task" element={<ValidateTask />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/frens" element={<FrensPage />} />
          <Route path="/game/:username" element={<GamePage />} /> {/* New route for the GamePage */}
        </Routes>
      </Router>
    </TonConnectUIProvider>
  );
}

export default App;