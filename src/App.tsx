import { Outlet } from "react-router-dom";
import { Nav } from "./components/Nav";

function App() {
  return (
    <>
      <Nav />
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
    </>
  );
}

export default App;
