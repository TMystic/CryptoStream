import { Route, Routes } from "react-router-dom";
import Layout from "./components/layout/Layout.jsx";
import Home from "./pages/Home.jsx";
import VideoDetail from "./pages/VideoDetail.jsx";
import MyVideos from "./pages/MyVideos.jsx";
import Upload from "./pages/Upload.jsx";
import Wallet from "./pages/Wallet.jsx";
import NotFound from "./pages/NotFound.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="video/:id" element={<VideoDetail />} />
        <Route path="my-videos" element={<MyVideos />} />
        <Route path="upload" element={<Upload />} />
        <Route path="wallet" element={<Wallet />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
