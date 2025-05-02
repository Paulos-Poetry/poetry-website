import React, { useEffect, useState } from "react";
import axios from "axios";
import "../styles/AdminDashboard.scss";

const URL = import.meta.env.VITE_ADDRESS;

interface User {
  _id: string;
  username: string;
  isAdmin: boolean;
}

const axiosInstance = axios.create({
  baseURL: URL,
});

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const userResponse = await axiosInstance.get("/users");
        setUsers(userResponse.data);
      } catch (error) {
        console.error("Error fetching users:", error);
        setError("Failed to fetch users.");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      await axiosInstance.delete(`/user/${selectedUser._id}`);
      setUsers(users.filter((user) => user._id !== selectedUser._id));
      setSelectedUser(null);
    } catch (error) {
      console.error("Error deleting user:", error);
      setError("Failed to delete user.");
    }
  };

  const handlePromoteUser = async () => {
    if (!selectedUser) return;
    try {
      await axiosInstance.put(`/user/${selectedUser._id}/make-admin`);
      setUsers(users.map((user) =>
        user._id === selectedUser._id ? { ...user, isAdmin: true } : user
      ));
      setSelectedUser(null);
    } catch (error) {
      console.error("Error promoting user to admin:", error);
      setError("Failed to promote user.");
    }
  };

  const handleRemoveAdmin = async () => {
    if (!selectedUser) return;
    try {
      await axiosInstance.put(`/user/${selectedUser._id}/remove-admin`);
      setUsers(users.map((user) =>
        user._id === selectedUser._id ? { ...user, isAdmin: false } : user
      ));
      setSelectedUser(null);
    } catch (error) {
      console.error("Error removing admin status:", error);
      setError("Failed to remove admin status.");
    }
  };

  const handlePdfRedirect = () => {
    navigate("/translation/admin", { state: { prefillTitle: "POEM " } });
  };


  return (
    <div className="admin-dashboard">
      <h2>Admin Dashboard - Manage Users</h2>

      {error && <p className="error-message">{error}</p>}
      {loading ? (
        <p>Loading users...</p>
      ) : (
        <div className="user-management">
          <h3>Manage Users</h3>
          <div className="user-selection-actions">
            <select
              value={selectedUser?._id || ""}
              onChange={(e) =>
                setSelectedUser(
                  users.find((user) => user._id === e.target.value) || null
                )
              }
            >
              <option value="">Select a user</option>
              {users.map((user) => (
                <option key={user._id} value={user._id}>
                  {user.username} {user.isAdmin ? "(Admin)" : ""}
                </option>
              ))}
            </select>

            {selectedUser && (
              <div className="action-buttons">
                <button onClick={handleDeleteUser}>Delete User</button>
                {!selectedUser.isAdmin ? (
                  <button onClick={handlePromoteUser}>Make Admin</button>
                ) : (
                  <button onClick={handleRemoveAdmin}>Remove Admin</button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
