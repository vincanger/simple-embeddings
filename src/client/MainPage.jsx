import waspLogo from './waspLogo.png'
import './Main.css'
import generateEmbeddings from '@wasp/actions/generateEmbeddings';
import { useState } from 'react';
import { useQuery } from '@wasp/queries';
import searchEmbeddings from '@wasp/queries/searchEmbeddings';

const MainPage = () => {
  const [query, setQuery] = useState("");
  const [isSearchEnabled, setIsSearchEnabled] = useState(false);

  const { data } = useQuery(searchEmbeddings, { inputQuery: query }, { enabled: isSearchEnabled });

  const handleClick = async() => {
    await generateEmbeddings();
  }

  const handleChange = (event) => {
    setIsSearchEnabled(false);
    setQuery(event.target.value);
  }

  return (
    <div className="container">
      <main>
        <div className="logo">
          <img src={waspLogo} alt="wasp" />
        </div>
        <button onClick={handleClick}>Generate Embeddings</button>
        <input id="query" type="text" placeholder="Enter query" onChange={handleChange} />
        <button onClick={() => setIsSearchEnabled(true)}>Search</button>

        <div className="results">
          {/* {data && JSON.stringify(data)} */}
          {data && data.map((result, index) => (
            <div key={index} className="result">
              <div className="result-title">TITLE: {result.title}</div>
              <div className="result-title">CONTENT: {result.content}</div>
              
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
export default MainPage
