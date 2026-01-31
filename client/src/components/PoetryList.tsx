import React, { useEffect, useState } from "react";
import axios from "axios";
import PoetryCard from "./PoetryCard";
import "../styles/PoetryList.scss"; // SCSS for PoetryList

interface Poem {
  _id: string;
  title: string;
  contentEnglish: string;
}

const PoetryList: React.FC = () => {
  const [poems, setPoems] = useState<Poem[]>([]);

  useEffect(() => {
    const fetchPoems = async () => {
      const response = await axios.get<Poem[]>("/poetry");
      setPoems(response.data);
    };
    fetchPoems();
  }, []);

  return (
    <div className="poetry-list">
      {poems.map((poem) => (
        <PoetryCard
          key={poem._id}
          _id={poem._id}
          title={poem.title}
          contentEnglish={poem.contentEnglish}
        />
      ))}
    </div>
  );
};

export default PoetryList;
