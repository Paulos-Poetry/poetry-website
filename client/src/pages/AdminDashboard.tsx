import React, { useEffect, useState } from "react";
import "../styles/AdminDashboard.scss";
import { SupabaseService } from "../services/apiService";
import { useAuth } from "../contexts/AuthContext";

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
  const { session } = useAuth();

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        const userData = await SupabaseService.getAllUsers();
        setUsers(userData);
      } catch (error) {
        console.error('Error fetching users from Supabase:', error);
        setError('Failed to fetch users.');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    if (selectedUser._id === session?.user?.id) {
      setError("You cannot delete your own account from here.");
      return;
    }
    const confirmed = window.confirm(
      `Delete user "${selectedUser.username}" (${selectedUser.email})? This cannot be undone.`
    );
    if (!confirmed) return;
    try {
      await SupabaseService.deleteUser(selectedUser._id);
      setUsers(users.filter((user) => user._id !== selectedUser._id));
      setSelectedUser(null);
      setError(null);
    } catch (error) {
      console.error("Error deleting user:", error);
      const err = error as { message?: string };
      setError(err.message || "Failed to delete user.");
    }
  };

  const handlePromoteUser = async () => {
    if (!selectedUser) return;
    try {
      await SupabaseService.makeUserAdmin(selectedUser._id);
      setUsers(users.map((user) =>
        user._id === selectedUser._id ? { ...user, isAdmin: true } : user
      ));
      setSelectedUser(null);
      setError(null);
    } catch (error) {
      console.error("Error promoting user to admin:", error);
      const err = error as { message?: string };
      setError(err.message || "Failed to promote user.");
    }
  };

  const handleRemoveAdmin = async () => {
    if (!selectedUser) return;
    try {
      await SupabaseService.removeUserAdmin(selectedUser._id);
      setUsers(users.map((user) =>
        user._id === selectedUser._id ? { ...user, isAdmin: false } : user
      ));
      setSelectedUser(null);
      setError(null);
    } catch (error) {
      console.error("Error removing admin status:", error);
      const err = error as { message?: string };
      setError(err.message || "Failed to remove admin status.");
    }
  };

  return (
    <div className="admin-dashboard">
      <h2>Admin Dashboard - Manage Users</h2>

      {error && <p className="error-message">{error}</p>}
      {loading ? (
        <p>Loading users...</p>
      ) : (
        <div className="user-management">
          <h3>Manage Users ({users.length})</h3>
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
                  {user.username} ({user.email}) {user.isAdmin ? "— Admin" : ""}
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
