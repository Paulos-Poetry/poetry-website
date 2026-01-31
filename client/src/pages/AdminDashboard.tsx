import React, { useEffect, useState } from "react";
import "../styles/AdminDashboard.scss";
import { useBackend } from "../contexts/BackendContext";
import { SupabaseService, HerokuService } from "../services/apiService";
import BackendSwitcher from "../components/BackendSwitcher";

interface User {
  _id: string;
  username: string;
  email: string;
  isAdmin: boolean;
}

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { currentBackend } = useBackend();

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        let userData: User[];
        if (currentBackend === 'supabase') {
          userData = await SupabaseService.getAllUsers();
        } else {
          userData = await HerokuService.getAllUsers();
        }
        setUsers(userData);
      } catch (error) {
        console.error(`Error fetching users from ${currentBackend}:`, error);
        setError(`Failed to fetch users from ${currentBackend}.`);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [currentBackend]);

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      if (currentBackend === 'supabase') {
        await SupabaseService.deleteUser(selectedUser._id);
      } else {
        await HerokuService.deleteUser(selectedUser._id);
      }
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
      if (currentBackend === 'supabase') {
        await SupabaseService.makeUserAdmin(selectedUser._id);
      } else {
        await HerokuService.makeUserAdmin(selectedUser._id);
      }
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
      if (currentBackend === 'supabase') {
        await SupabaseService.removeUserAdmin(selectedUser._id);
      } else {
        await HerokuService.removeUserAdmin(selectedUser._id);
      }
      setUsers(users.map((user) =>
        user._id === selectedUser._id ? { ...user, isAdmin: false } : user
      ));
      setSelectedUser(null);
    } catch (error) {
      console.error("Error removing admin status:", error);
      setError("Failed to remove admin status.");
    }
  };

  return (
    <div className="admin-dashboard">
      <BackendSwitcher />
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
