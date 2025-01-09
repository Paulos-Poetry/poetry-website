import React, { useEffect, useState } from "react";
import axios from "axios";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css"; // Import Quill styles
import "../styles/AdminDashboard.scss";
const URL = import.meta.env.VITE_ADDRESS;
import { useNavigate } from "react-router-dom"; // For navigation

// Define the Poem and User interface for TypeScript
interface Poem {
  _id: string;
  title: string;
  contentEnglish: string;
  contentGreek: string;
}

interface User {
  _id: string;
  username: string;
  isAdmin: boolean;
}

const axiosInstance = axios.create({
  baseURL: URL, // Make sure this points to the correct backend
});

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate(); // Get the navigate function from useNavigate hook
  const [poems, setPoems] = useState<Poem[]>([]); // Initialize as an empty array for poems
  const [users, setUsers] = useState<User[]>([]); // Initialize as an empty array for users
  const [selectedPoem, setSelectedPoem] = useState<Poem | null>(null); // Track the selected poem
  const [selectedUser, setSelectedUser] = useState<User | null>(null); // Track the selected user
  const [newPoem, setNewPoem] = useState({
    title: "",
    contentEnglish: "",
    contentGreek: "",
  });
  const [editMode, setEditMode] = useState<boolean>(false); // Track whether we are editing a poem
  //@ts-ignore
  const [loading, setLoading] = useState<boolean>(true); // Add loading state
  //@ts-ignore
  const [error, setError] = useState<string | null>(null); // Error handling

  // React Quill key reset, to forcefully clear content
  const [quillKey, setQuillKey] = useState(0);

  // Fetch existing poems and users from the API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const poemResponse = await axiosInstance.get("/poetry");
        const userResponse = await axiosInstance.get("/users"); // Fetch users from the correct endpoint

        setPoems(poemResponse.data);
        setUsers(userResponse.data);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to fetch poems or users.");
      } finally {
        setLoading(false); // Set loading to false after fetching
      }
    };
    fetchData();
  }, []);

  // Handle input change for the new poem form
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewPoem({ ...newPoem, [e.target.name]: e.target.value });
  };

  // Handle form submission to add a new poem or update an existing one
  const handleSubmitPoem = async (e: React.FormEvent) => {
    e.preventDefault();

    // If contentEnglish or contentGreek is empty, set default text
    const updatedPoem = {
      ...newPoem,
      contentEnglish:
        newPoem.contentEnglish.trim() === ""
          ? "This work has no translation yet..."
          : newPoem.contentEnglish,
      contentGreek:
        newPoem.contentGreek.trim() === ""
          ? "This work has no translation yet..."
          : newPoem.contentGreek,
    };

    if (editMode && selectedPoem) {
      // Update the poem
      try {
        const response = await axiosInstance.put(
          `/poetry/${selectedPoem._id}`,
          updatedPoem // Pass the updated poem with placeholder text if needed
        );
        setPoems(
          poems.map((poem) =>
            poem._id === selectedPoem._id ? response.data : poem
          )
        );
        resetForm(); // Reset the form after updating
      } catch (error) {
        console.error("Error updating poem:", error);
        setError("Failed to update poem.");
      }
    } else {
      // Create a new poem
      try {
        const response = await axiosInstance.post("/poetry", updatedPoem); // Pass the updated poem
        setPoems([...poems, response.data]); // Add the new poem to the list
        resetForm(); // Clear the form after creating the poem
      } catch (error) {
        console.error("Error adding poem:", error);
        setError("Failed to add poem.");
      }
    }
  };

  // Reset the form fields and exit edit mode
  const resetForm = () => {
    setNewPoem({ title: "", contentEnglish: "", contentGreek: "" }); // Clear the form fields
    setEditMode(false); // Exit edit mode
    setSelectedPoem(null); // Clear selected poem
    setQuillKey((prevKey) => prevKey + 1); // Force React Quill to reset
  };

  // Handle the React Quill input change
  const handleContentEnglishChange = (content: string) => {
    setNewPoem({ ...newPoem, contentEnglish: content });
  };

  const handleContentGreekChange = (content: string) => {
    setNewPoem({ ...newPoem, contentGreek: content });
  };

  // Handle selecting a poem for editing
  const handleEditPoem = (poemId: string) => {
    const poem = poems.find((p) => p._id === poemId);
    if (poem) {
      setNewPoem({
        title: poem.title,
        contentEnglish:
          poem.contentEnglish || "This work has no translation yet...",
        contentGreek:
          poem.contentGreek || "This work has no translation yet...",
      });
      setSelectedPoem(poem);
      setEditMode(true); // Enter edit mode
      setQuillKey((prevKey) => prevKey + 1); // Reset Quill editors with a new key
    }
  };

  // Handle poem deletion
  const handleDeletePoem = async () => {
    if (selectedPoem) {
      try {
        // Delete the selected poem from the server
        await axiosInstance.delete(`/poetry/${selectedPoem._id}`);

        // Remove the deleted poem from the state
        setPoems(poems.filter((poem) => poem._id !== selectedPoem._id));

        // Exit edit mode but keep the poem's text in the form fields
        setEditMode(false); // Switch back to "add poem" mode

        // Keep the text of the deleted poem in the form
        setNewPoem({
          title: selectedPoem.title,
          contentEnglish: selectedPoem.contentEnglish,
          contentGreek: selectedPoem.contentGreek,
        });

        // Clear the selected poem as it's been deleted
        setSelectedPoem(null);
      } catch (error) {
        console.error("Error deleting poem:", error);
        setError("Failed to delete poem.");
      }
    }
  };

  // Handle user deletion
  const handleDeleteUser = async () => {
    if (selectedUser) {
      try {
        await axiosInstance.delete(`/user/${selectedUser._id}`);
        setUsers(users.filter((user) => user._id !== selectedUser._id)); // Remove the deleted user from the list
        setSelectedUser(null); // Clear the selected user
      } catch (error) {
        console.error("Error deleting user:", error);
        setError(error + " Failed to delete user.");
      }
    }
  };

  // Handle promoting a user to admin
  const handlePromoteUser = async () => {
    if (selectedUser) {
      try {
        await axiosInstance.put(`/user/${selectedUser._id}/make-admin`);
        setUsers(
          users.map((user) =>
            user._id === selectedUser._id ? { ...user, isAdmin: true } : user
          )
        ); // Update user to admin
        setSelectedUser(null); // Clear the selected user
      } catch (error) {
        console.error("Error promoting user to admin:", error);
        setError(error + " Failed to promote user.");
      }
    }
  };

  // Handle removing admin status from a user
  const handleRemoveAdmin = async () => {
    if (selectedUser) {
      try {
        await axiosInstance.put(`/user/${selectedUser._id}/remove-admin`);
        setUsers(
          users.map((user) =>
            user._id === selectedUser._id ? { ...user, isAdmin: false } : user
          )
        ); // Update user admin status
        setSelectedUser(null); // Clear the selected user
      } catch (error) {
        console.error("Error removing admin status:", error);
        setError(error + " Failed to remove admin status.");
      }
    }
  };

  const handlePdfRedirect = () => {
    navigate("/translation/admin", { state: { prefillTitle: "POEM" } });
  };

  return (
    <div className="admin-dashboard">
      <h2>{editMode ? "Edit Poem" : "Add New Poem"}</h2>

      {/* Add or edit poem form */}
      <form onSubmit={handleSubmitPoem}>
        <input
          type="text"
          name="title"
          placeholder="Title"
          value={newPoem.title}
          onChange={handleInputChange}
          required
        />
        <h3>Poem in English</h3>
        <ReactQuill
          key={quillKey + "-en"} // Force reset of React Quill editor when key changes
          theme="snow"
          value={newPoem.contentEnglish}
          onChange={handleContentEnglishChange}
        />
        <h3>Poem in Greek</h3>
        <ReactQuill
          key={quillKey + "-gr"} // Force reset of React Quill editor when key changes
          theme="snow"
          value={newPoem.contentGreek}
          onChange={handleContentGreekChange}
        />

        {/* Button Container for aligning Add Poem and Reset Poem buttons */}
        <div className="button-container">
          <button type="submit">{editMode ? "Update Poem" : "Add Poem"}</button>

          <button
            type="button"
            className="reset-button"
            onClick={() => {
              if (
                window.confirm(
                  "Are you sure you want to reset the poem? This action will clear all fields."
                )
              ) {
                resetForm(); // Call the resetForm function
              }
            }}
          >
            Reset Poem
          </button>
        </div>
        <div className="pdf-button-container">
          <button
            type="button"
            onClick={handlePdfRedirect}
            className="redirect-to-pdf"
          >
            Add PDF (Redirect)
          </button>
        </div>
      </form>

      {/* Poem Management */}
      <div className="poem-management">
        <h3>Manage Poems</h3>
        <select
          value={selectedPoem?._id || ""}
          onChange={(e) => handleEditPoem(e.target.value)}
        >
          <option value="">Select a poem</option>
          {poems.map((poem) => (
            <option key={poem._id} value={poem._id}>
              {poem.title}
            </option>
          ))}
        </select>

        {selectedPoem && (
          <div className="poem-actions">
            <button onClick={resetForm}>Cancel Edit</button>{" "}
            {/* Cancel edit button */}
            <button onClick={handleDeletePoem}>Delete Poem</button>
          </div>
        )}
      </div>

      {/* User Management */}
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
    </div>
  );
};

export default AdminDashboard;
