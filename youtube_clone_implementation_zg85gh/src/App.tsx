import { Authenticated, Unauthenticated, useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { useState, useRef, FormEvent } from "react";
import { toast, Toaster } from "sonner";
import { BrowserRouter, Routes, Route, Link, useNavigate } from "react-router-dom";
import VideoPage from "./VideoPage";

// Common typos and their corrections
const commonTypos: Record<string, string> = {
  "teh": "the",
  "recieved": "received",
  "wierd": "weird",
  "reccomend": "recommend",
  "occured": "occurred",
  "seperate": "separate",
  "definately": "definitely",
  "alot": "a lot",
  "untill": "until",
  "begining": "beginning",
};

function autoCorrect(text: string): string {
  return text.split(/\s+/).map(word => {
    const lowerWord = word.toLowerCase();
    return commonTypos[lowerWord] || word;
  }).join(" ");
}

function Header({ showUpload, setShowUpload, searchQuery, setSearchQuery, onSearch }: { 
  showUpload: boolean; 
  setShowUpload: (show: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSearch: (query: string) => void;
}) {
  const [inputValue, setInputValue] = useState(searchQuery);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const correctedQuery = autoCorrect(inputValue);
    if (correctedQuery !== inputValue) {
      setInputValue(correctedQuery);
      toast.info("Search text was auto-corrected");
    }
    setSearchQuery(correctedQuery);
    onSearch(correctedQuery);
  };

  return (
    <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm p-4 flex justify-between items-center border-b">
      <Link to="/" className="text-xl font-semibold accent-text">
        WonderScape
      </Link>
      <form onSubmit={handleSubmit} className="flex-1 max-w-xl mx-4">
        <input
          type="search"
          placeholder="Search videos... (press Enter)"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="w-full px-4 py-2 rounded-full border focus:outline-none focus:border-blue-500"
        />
      </form>
      <div className="flex items-center gap-4">
        <Authenticated>
          <button
            onClick={() => setShowUpload(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Upload Video
          </button>
        </Authenticated>
        <SignOutButton />
      </div>
    </header>
  );
}

function HomePage({ showUpload, setShowUpload, searchQuery }: { 
  showUpload: boolean; 
  setShowUpload: (show: boolean) => void;
  searchQuery: string;
}) {
  const [sortBy, setSortBy] = useState<"recent" | "views">("recent");
  const videos = useQuery(api.videos.listVideos, { sortBy, searchQuery });
  const generateUploadUrl = useMutation(api.videos.generateUploadUrl);
  const createVideo = useMutation(api.videos.createVideo);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const videoInput = useRef<HTMLInputElement>(null);
  const thumbnailInput = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    const videoFile = videoInput.current?.files?.[0];
    const thumbnailFile = thumbnailInput.current?.files?.[0];
    
    if (!videoFile) {
      toast.error("Please select a video file");
      return;
    }

    try {
      const videoPostUrl = await generateUploadUrl();
      const videoResult = await fetch(videoPostUrl, {
        method: "POST",
        headers: { "Content-Type": videoFile.type },
        body: videoFile,
      });
      const { storageId: videoStorageId } = await videoResult.json();

      let thumbnailStorageId = undefined;
      if (thumbnailFile) {
        const thumbnailPostUrl = await generateUploadUrl();
        const thumbnailResult = await fetch(thumbnailPostUrl, {
          method: "POST",
          headers: { "Content-Type": thumbnailFile.type },
          body: thumbnailFile,
        });
        const { storageId } = await thumbnailResult.json();
        thumbnailStorageId = storageId;
      }

      await createVideo({
        title,
        description,
        storageId: videoStorageId,
        thumbnailId: thumbnailStorageId,
      });
      
      setTitle("");
      setDescription("");
      if (videoInput.current) videoInput.current.value = "";
      if (thumbnailInput.current) thumbnailInput.current.value = "";
      setShowUpload(false);
      toast.success("Video uploaded successfully!");
    } catch (error) {
      toast.error("Upload failed");
      console.error(error);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <Authenticated>
        {showUpload && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Upload Video</h2>
                <button
                  onClick={() => setShowUpload(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleUpload} className="flex flex-col gap-4">
                <input
                  type="text"
                  placeholder="Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="border p-2 rounded"
                  required
                />
                <textarea
                  placeholder="Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="border p-2 rounded"
                  required
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Video File
                  </label>
                  <input
                    type="file"
                    accept="video/*"
                    ref={videoInput}
                    className="border p-2 rounded w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Thumbnail Image (optional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    ref={thumbnailInput}
                    className="border p-2 rounded w-full"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Upload
                </button>
              </form>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Videos</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setSortBy("recent")}
              className={`px-4 py-2 rounded ${
                sortBy === "recent"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              Most Recent
            </button>
            <button
              onClick={() => setSortBy("views")}
              className={`px-4 py-2 rounded ${
                sortBy === "views"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              Most Viewed
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos?.map((video) => (
            <div
              key={video._id}
              className="bg-white rounded-lg shadow overflow-hidden cursor-pointer"
              onClick={() => navigate(`/video/${video._id}`)}
            >
              <div className="relative aspect-video">
                {video.thumbnailUrl ? (
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={video.url ?? undefined}
                    className="w-full h-full object-cover"
                    preload="metadata"
                  />
                )}
                <div className="absolute inset-0 bg-black/10 hover:bg-black/20 transition-colors" />
              </div>
              <div className="p-4">
                <h3 className="font-bold">{video.title}</h3>
                <p className="text-gray-600 line-clamp-2">{video.description}</p>
                <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
                  <span>{video.username}</span>
                  <span>{video.views} views</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Authenticated>

      <Unauthenticated>
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Welcome to The WonderScape</h1>
          <p className="text-xl text-gray-600 mb-8">Sign in to upload and watch videos</p>
          <SignInForm />
        </div>
      </Unauthenticated>
    </div>
  );
}

export default function App() {
  const [showUpload, setShowUpload] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <Header 
          showUpload={showUpload} 
          setShowUpload={setShowUpload}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSearch={(query) => setSearchQuery(query)}
        />
        <main className="flex-1 p-8">
          <Routes>
            <Route
              path="/"
              element={
                <div className="max-w-6xl mx-auto">
                  <HomePage 
                    showUpload={showUpload} 
                    setShowUpload={setShowUpload}
                    searchQuery={searchQuery}
                  />
                </div>
              }
            />
            <Route path="/video/:videoId" element={<VideoPage />} />
          </Routes>
        </main>
        <Toaster />
      </div>
    </BrowserRouter>
  );
}
