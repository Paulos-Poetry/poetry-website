import React, { useState } from 'react';
import axios from 'axios';
import { SupabaseService, Poem, Translation } from '../services/apiService';

interface DataInspectorProps {
  apiUrl: string;
  backendType: 'heroku' | 'supabase';
}

const DataInspector: React.FC<DataInspectorProps> = ({ apiUrl, backendType }) => {
  const [poetryData, setPoetyData] = useState<Poem[] | null>(null);
  const [translationData, setTranslationData] = useState<Translation[] | null>(null);
  const [loading, setLoading] = useState(false);

  const inspectData = async () => {
    setLoading(true);
    console.log(`🔍 Inspecting ${backendType} data structure...`);

    try {
      if (backendType === 'supabase') {
        // Use Supabase client for Supabase backend
        console.log('📝 Fetching Supabase Poetry Data...');
        const poetryData = await SupabaseService.getAllPoems();
        console.log(`📝 ${backendType} Poetry Data:`, poetryData);
        setPoetyData(poetryData);

        console.log('📚 Fetching Supabase Translations Data...');
        const translationsData = await SupabaseService.getAllTranslations();
        console.log(`📚 ${backendType} Translations Data:`, translationsData);
        setTranslationData(translationsData);

        // Inspect specific poetry item with comments
        if (poetryData && poetryData.length > 0) {
          const firstPoem = poetryData[0];
          const poemId = firstPoem._id || firstPoem.id;
          if (poemId) {
            const poemDetailData = await SupabaseService.getPoemById(poemId);
            console.log(`📖 ${backendType} Poem Detail (with comments):`, poemDetailData);
          }
        }
      } else {
        // Use Axios for Heroku backend
        console.log('📝 Fetching Heroku Poetry Data...');
        const poetryResponse = await axios.get<Poem[]>(`${apiUrl}/poetry`);
        console.log(`📝 ${backendType} Poetry Data:`, poetryResponse.data);
        setPoetyData(poetryResponse.data);

        console.log('📚 Fetching Heroku Translations Data...');
        const translationsResponse = await axios.get<Translation[]>(`${apiUrl}/translations/all`);
        console.log(`📚 ${backendType} Translations Data:`, translationsResponse.data);
        setTranslationData(translationsResponse.data);

        // Inspect specific poetry item with comments
        if (poetryResponse.data && poetryResponse.data.length > 0) {
          const firstPoem = poetryResponse.data[0];
          const poemDetailResponse = await axios.get(`${apiUrl}/poetry/${firstPoem._id}`);
          console.log(`📖 ${backendType} Poem Detail (with comments):`, poemDetailResponse.data);
        }

        // Inspect specific translation info
        if (translationsResponse.data && translationsResponse.data.length > 0) {
          const firstTranslation = translationsResponse.data[0];
          try {
            const translationInfoResponse = await axios.get(`${apiUrl}/translations/info/${firstTranslation._id}`);
            console.log(`📄 ${backendType} Translation Info:`, translationInfoResponse.data);
          } catch {
            console.log(`ℹ️ Translation info endpoint may not exist for ${backendType}`);
          }
        }
      }

    } catch (error) {
      console.error(`❌ Error inspecting ${backendType} data:`, error);
    } finally {
      setLoading(false);
    }
  };

  const downloadStructure = () => {
    const structure = {
      backend: backendType,
      timestamp: new Date().toISOString(),
      data: {
        poetry: poetryData,
        translations: translationData
      }
    };

    const blob = new Blob([JSON.stringify(structure, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${backendType}-data-structure.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ 
      padding: '20px', 
      border: '2px solid #ddd', 
      borderRadius: '8px', 
      margin: '20px 0',
      backgroundColor: backendType === 'heroku' ? '#f0f8ff' : '#fff0f5'
    }}>
      <h3>🔍 {backendType.toUpperCase()} Data Inspector</h3>
      
      <button 
        onClick={inspectData} 
        disabled={loading}
        style={{
          padding: '10px 20px',
          backgroundColor: backendType === 'heroku' ? '#4CAF50' : '#FF6B6B',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginRight: '10px'
        }}
      >
        {loading ? 'Inspecting...' : `Inspect ${backendType} Data`}
      </button>

      {(poetryData || translationData) && (
        <button 
          onClick={downloadStructure}
          style={{
            padding: '10px 20px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Download Structure JSON
        </button>
      )}

      {poetryData && (
        <div style={{ marginTop: '15px' }}>
          <h4>📝 Poetry Sample Structure:</h4>
          <pre style={{ 
            backgroundColor: '#f5f5f5', 
            padding: '10px', 
            borderRadius: '4px', 
            overflow: 'auto',
            fontSize: '12px'
          }}>
            {JSON.stringify(poetryData[0], null, 2)}
          </pre>
        </div>
      )}

      {translationData && (
        <div style={{ marginTop: '15px' }}>
          <h4>📚 Translation Sample Structure:</h4>
          <pre style={{ 
            backgroundColor: '#f5f5f5', 
            padding: '10px', 
            borderRadius: '4px', 
            overflow: 'auto',
            fontSize: '12px'
          }}>
            {JSON.stringify(translationData[0], null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default DataInspector;