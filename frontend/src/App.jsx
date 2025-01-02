import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import AdminDashboard from './components/AdminDashboard/AdminDashboard';
import './App.css';

// Import other components as needed
// import TaskComponent from './TaskComponent';
// import WinLossPage from './WinLossPage';
// ... other imports

// Ensure the manifest URL is correctly set
const manifestUrl = "https://task.pooldegens.meme/tonconnect-manifest.json";

const App = () => {  // Changed to arrow function for consistency
  return (
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      <Router>
        <Routes>
          {/* Redirect root to admin dashboard */}
          <Route path="/" element={<Navigate to="/admin-dashboard" replace />} />
          
          {/* Keep AdminDashboard route and comment out others until components are migrated */}
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          {/* 
          <Route path="/game-result" element={<WinLossPage />} />
          <Route path="/admin" element={<AdminTaskComponent />} />
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
          <Route path="/game/:username" element={<GamePage />} />
          */}

          {/* Catch all route - redirect to admin dashboard */}
          <Route path="*" element={<Navigate to="/admin-dashboard" replace />} />
        </Routes>
      </Router>
    </TonConnectUIProvider>
  );
};

export default App;
