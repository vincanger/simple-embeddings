import waspLogo from './waspLogo.png';
import './Main.css';
import generateEmbeddings from '@wasp/actions/generateEmbeddings';
import { useState } from 'react';
import { useQuery } from '@wasp/queries';
import searchEmbeddings from '@wasp/queries/searchEmbeddings';
import getFilesToEmbed from '@wasp/queries/getFilesToEmbed';

const MainPage = () => {
  const [query, setQuery] = useState('');
  const [isSearchEnabled, setIsSearchEnabled] = useState(false);
  const [isEmbedding, setIsEmbedding] = useState(false);
  const [isEmbedded, setIsEmbedded] = useState(false);

  const { data } = useQuery(searchEmbeddings, { inputQuery: query }, { enabled: isSearchEnabled });
  const { data: filesToEmed } = useQuery(getFilesToEmbed);

  const handleClick = async () => {
    setIsEmbedding(true);
    await generateEmbeddings();
    setIsEmbedding(false);
    setIsEmbedded(true);
  };

  const handleChange = (event) => {
    setIsSearchEnabled(false);
    setQuery(event.target.value);
  };

  return (
    <div className='min-h-screen bg-amber-50'>
      <div className='w-full sm:w-2/3 mx-auto'>
        <div className='py-7 flex flex-col items-center'>
          <div className='flex pb-7 justify-center items-center'>
            <img src={waspLogo} className='h-6 mr-2 ' alt='wasp' />
            <h1 className='text-xl ml-1'>Generate Embeddings and Perform Vector Searches w/ Wasp!</h1>
          </div>
          <div class='flex pb-7 items-center justify-evenly w-full'>
            <div class='w-2/6 border-t border-neutral-700'></div>
            <span class='text-neutral-700 text-center'>✨ 🐝 ✨</span>
            <div class='w-2/6 border-t border-neutral-700'></div>
          </div>
          <div className='flex space-x-12 justify-center w-full'>
            <div className='flex flex-col rounded-lg border border-neutral-700 p-7 w-full'>
              {filesToEmed && filesToEmed.length > 0 && (
                <>
                  <div className='flex items-center space-x-2'>
                    <div className='font-bold'> 📁 Files to embed </div>{' '}
                    <div className='italic opacity-80'> ./src/shared/docs:</div>
                  </div>
                  <ul className='mb-4 indent-4'>
                    {filesToEmed.map((file, index) => (
                      <li className='' key={index}>
                        * {file}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {!isEmbedding ? (
                <button className='shadow px-2 py-1 text-neutral-700 bg-yellow-400 rounded ' onClick={handleClick}>
                  {!isEmbedded ? '🧮 Generate Embeddings' : '✅ Embeddings Generated'}
                </button>
              ) : (
                <button
                  className='shadow px-2 py-1 text-neutral-700 bg-yellow-400 rounded opacity-50'
                  disabled
                  onClick={handleClick}
                >
                  Generating...
                </button>
              )}
            </div>
            <div className='flex flex-col justify-between rounded-lg border border-neutral-700 p-7 w-full'>
              <textarea
                type='text'
                className='shadow appearance-none border border-neutral-500 rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline'
                placeholder='Enter query'
                onChange={handleChange}
              />
              <button
                className='shadow px-2 py-1 text-neutral-700 bg-yellow-400 rounded whitespace-nowrap'
                onClick={() => setIsSearchEnabled(true)}
              >
                🔎 Search Your Embeddings
              </button>
            </div>
          </div>
        </div>
        <div className='flex justify-center items-center '>
          {data && data.length > 0 && (
            <div className='border border-neutral-700 rounded-lg p-7 grid grid-rows-3 gap-7'>
              {data.map((result, index) => (
                <div
                  key={index}
                  className='border border-neutral-500 flex flex-col p-7 bg-yellow-500/30 text-neutral-700 rounded-lg'
                >
                  <div className='mb-2'>
                    <div className='font-bold mr-2'>TITLE:</div> {result.title}
                  </div>
                  <div>
                    <div className='font-bold mr-2'>CONTENT:</div> {result.content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default MainPage;
