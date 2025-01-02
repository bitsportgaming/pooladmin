import React, { useEffect, useState } from 'react';
import api from './api/axios';
import './AdminDashboard.css';

/**
 * @typedef {Object} User
 * @property {string} _id
 * @property {string} username
 * @property {number} score
 * @property {number} weekly_score
 * @property {string} referral_code
 * @property {string} referrer
 * @property {number} referral_count
 * @property {string} [identifier]
 */

/**
 * @typedef {Object} Referral
 * @property {string} _id
 * @property {string} username
 * @property {number} score
 * @property {string} referral_code
 */

const AdminDashboard = () => {
  // Analytics state
  const [totalScore, setTotalScore] = useState(0);
  const [averageScore, setAverageScore] = useState(0);
  const [topPerformers, setTopPerformers] = useState([]);
  const [users, setUsers] = useState([]);
  const [userCount, setUserCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [username, setUsername] = useState('');
  const [score, setScore] = useState(0);
  const [weeklyScore, setWeeklyScore] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReferralsModal, setShowReferralsModal] = useState(false);
  const limit = 10;

  // Initial data load and page changes
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await fetchUserCount();
        // Start from page 1 explicitly
        setCurrentPage(1);
        await fetchUsers(1);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []); // Only run on mount

  // Handle page changes
  useEffect(() => {
    const loadPage = async () => {
      if (currentPage > 1) { // Only fetch for pages after first
        setIsLoading(true);
        try {
          await fetchUsers(currentPage);
        } catch (error) {
          console.error('Error loading page:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    loadPage();
  }, [currentPage]); // Load data whenever page changes

  const fetchUserCount = async () => {
    try {
      const response = await api.get('/user_scores/count');
      console.log('Count response:', response.data); // Debug log
      if (response.data && typeof response.data.count === 'number') {
        setUserCount(response.data.count);
        setTotalPages(Math.ceil(response.data.count / limit));
      } else {
        console.error('Invalid count response format:', response.data);
      }
    } catch (error) {
      console.error('Error fetching user count:', error);
    }
  };

  const fetchUsers = async (page) => {
    setIsLoading(true);
    try {
      // Get paginated users with retry logic
      const maxRetries = 3;
      let retryCount = 0;
      let success = false;
      let response;

      while (!success && retryCount < maxRetries) {
        try {
          response = await api.get(`/user_scores`, {
            params: {
              page,
              limit
            }
          });
          success = true;
        } catch (error) {
          retryCount++;
          if (retryCount === maxRetries) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
        }
      }

      const { users, stats } = response.data;
      if (users && Array.isArray(users)) {
        setUsers(users);
        if (stats) {
          setTotalScore(stats.totalScore);
          setAverageScore(stats.averageScore);
          setTopPerformers(stats.topPerformers || []);
        }
      } else {
        console.error('Invalid users response format:', response.data);
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
      // Reset to page 1 on error
      if (page > 1) {
        setCurrentPage(1);
        await fetchUsers(1);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    setIsLoading(true);
    try {
      const maxRetries = 3;
      let retryCount = 0;
      let success = false;

      while (!success && retryCount < maxRetries) {
        try {
          await api.delete(`/user_scores/${id}`);
          success = true;
        } catch (error) {
          retryCount++;
          if (retryCount === maxRetries) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }

      await fetchUsers(currentPage);
      await fetchUserCount();
      alert('User deleted successfully');
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const editUser = async () => {
    setIsLoading(true);
    try {
      const maxRetries = 3;
      let retryCount = 0;
      let success = false;

      while (!success && retryCount < maxRetries) {
        try {
          const updatedDetails = { username, score, weekly_score: weeklyScore };
          await api.put(`/user_scores/${selectedUser._id}`, updatedDetails);
          success = true;
        } catch (error) {
          retryCount++;
          if (retryCount === maxRetries) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }

      await fetchUsers(currentPage);
      setShowEditModal(false);
      alert('User updated successfully');
    } catch (error) {
      console.error('Error editing user:', error);
      alert('Failed to update user. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm) {
      fetchUsers(currentPage);
      return;
    }

    setIsLoading(true);
    try {
      // Add retry logic for search
      const maxRetries = 3;
      let retryCount = 0;
      let success = false;
      let response;

      while (!success && retryCount < maxRetries) {
        try {
          response = await api.get(`/user_scores/search`, {
            params: {
              username: searchTerm
            }
          });
          success = true;
        } catch (error) {
          retryCount++;
          if (retryCount === maxRetries) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }

      if (response.data && Array.isArray(response.data.users)) {
        setUsers(response.data.users);
        
        // Update stats with search results
        const searchUsers = response.data.users;
        const total = searchUsers.reduce((acc, user) => acc + user.score, 0);
        setTotalScore(total);
        setAverageScore(total / searchUsers.length);
        
        // Update top performers from search results
        const sorted = [...searchUsers].sort((a, b) => b.score - a.score);
        setTopPerformers(sorted.slice(0, 3));

        // Reset pagination for search results
        setCurrentPage(1);
        setTotalPages(Math.ceil(searchUsers.length / limit));
      } else {
        console.error('Invalid search response format:', response.data);
        setUsers([]);
        setTotalPages(0);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      setUsers([]);
      setTotalPages(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Add debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm) {
        handleSearch();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchReferrals = async (identifier) => {
    setIsLoading(true);
    try {
      const maxRetries = 3;
      let retryCount = 0;
      let success = false;
      let response;

      while (!success && retryCount < maxRetries) {
        try {
          response = await api.get(`/user_scores/referrals/${identifier}`);
          success = true;
        } catch (error) {
          retryCount++;
          if (retryCount === maxRetries) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }

      setReferrals(response.data.referrals || []);
      setShowReferralsModal(true);
    } catch (error) {
      console.error('Error fetching referrals:', error);
      alert('Failed to fetch referrals. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowReferrals = async (user) => {
    if (!user.identifier) {
      alert('User identifier is missing');
      return;
    }
    setSelectedUser(user);
    await fetchReferrals(user.identifier);
  };

  const handleEditUserClick = (user) => {
    setSelectedUser(user);
    setUsername(user.username || '');
    setScore(user.score || 0);
    setWeeklyScore(user.weekly_score || 0);
    setShowEditModal(true);
  };

  const handleKeyPress = (e, action) => {
    if (e.key === 'Enter') {
      action();
    }
  };

  return (
    <div className="dashboard-container">
      {/* Header Section */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Admin Dashboard</h1>
          <div className="header-stats">
            <div className="stat-card">
              <span className="stat-icon">👥</span>
              <div className="stat-info">
                <h3>Total Users</h3>
                <p>{userCount}</p>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">🏆</span>
              <div className="stat-info">
                <h3>Total Score</h3>
                <p>{totalScore.toLocaleString()}</p>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">📊</span>
              <div className="stat-info">
                <h3>Average Score</h3>
                <p>{averageScore.toFixed(1)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Performers Section */}
      <div className="top-performers">
        <h2>Top Performers</h2>
        <div className="performers-grid">
          {topPerformers.map((user, index) => (
            <div key={user._id} className="performer-card">
              <div className="performer-rank">#{index + 1}</div>
              <div className="performer-info">
                <h3>{user.username}</h3>
                <p>Score: {user.score}</p>
                <p>Weekly: {user.weekly_score}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Search Section */}
      <div className="search-section">
        <h2>User Management</h2>
        <input 
          type="text" 
          placeholder="Search by username..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={(e) => handleKeyPress(e, handleSearch)}
          autoFocus
        />
        <button onClick={handleSearch}>Search</button>
      </div>
      {/* User List */}
      <div className="user-section">
        {isLoading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="no-users-state">
            <span className="no-data-icon">👥</span>
            <p>No users found</p>
          </div>
        ) : (
          <ul className="user-list">
          {users.map(user => (
            <li key={user._id} className="user-item">
              <div className="user-info">
                <div className="user-header">
                  <h3>{user.username}</h3>
                  <span className="user-id">ID: {user._id}</span>
                </div>
                <div className="user-stats">
                  <div className="stat">
                    <span className="stat-label">Score</span>
                    <span className="stat-value">{user.score}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Weekly</span>
                    <span className="stat-value">{user.weekly_score}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Referrals</span>
                    <span className="stat-value">{user.referral_count}</span>
                  </div>
                </div>
                <div className="user-details">
                  <p><strong>Referral Code:</strong> {user.referral_code}</p>
                  <p><strong>Referrer:</strong> {user.referrer || 'None'}</p>
                </div>
              </div>
              <div className="user-actions">
                <button className="edit" onClick={() => handleEditUserClick(user)}>
                  <span className="action-icon">✏️</span> Edit
                </button>
                <button className="show-referrals" onClick={() => handleShowReferrals(user)}>
                  <span className="action-icon">👥</span> Referrals
                </button>
                <button className="delete" onClick={() => deleteUser(user._id)}>
                  <span className="action-icon">🗑️</span> Delete
                </button>
              </div>
            </li>
          ))}
          </ul>
        )}

        {/* Pagination */}
        <div className="pagination">
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span>Page {currentPage} of {totalPages}</span>
          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      </div>
      {/* Edit Modal */}
      {showEditModal && (
        <div 
          className="modal" 
          onClick={(e) => {
            if (e.target.className === 'modal') {
              setShowEditModal(false);
            }
          }}
        >
          <div className="modal-content">
            <div className="modal-header">
              <h2>Edit User</h2>
              <button className="close-button" onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <label>Username:</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={(e) => handleKeyPress(e, editUser)}
              placeholder="Enter username"
              autoFocus
            />
            <label>Score:</label>
            <input 
              type="number" 
              value={score} 
              onChange={(e) => setScore(parseInt(e.target.value) || 0)}
              onKeyPress={(e) => handleKeyPress(e, editUser)}
              placeholder="Enter score"
              min="0"
            />
            <label>Weekly Score:</label>
            <input 
              type="number" 
              value={weeklyScore} 
              onChange={(e) => setWeeklyScore(parseInt(e.target.value) || 0)}
              onKeyPress={(e) => handleKeyPress(e, editUser)}
              placeholder="Enter weekly score"
              min="0"
            />
            <button onClick={editUser}>Save</button>
            <button onClick={() => setShowEditModal(false)}>Cancel</button>
          </div>
        </div>
      )}
      {/* Referrals Modal */}
      {showReferralsModal && selectedUser && (
        <div 
          className="modal" 
          onClick={(e) => {
            if (e.target.className === 'modal') {
              setShowReferralsModal(false);
            }
          }}
        >
          <div className="modal-content">
            <div className="modal-header">
              <h2>Referrals for {selectedUser.username}</h2>
              <button className="close-button" onClick={() => setShowReferralsModal(false)}>×</button>
            </div>
            <div className="referrals-list">
              {referrals.length > 0 ? (
                <ul>
                  {referrals.map(referral => (
                    <li key={referral._id} className="referral-item">
                      <div className="referral-info">
                        <h4>{referral.username}</h4>
                        <div className="referral-stats">
                          <span><strong>Score:</strong> {referral.score}</span>
                          <span><strong>Code:</strong> {referral.referral_code}</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="no-referrals">
                  <span className="no-data-icon">👥</span>
                  <p>No referrals found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
