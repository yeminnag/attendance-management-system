import { Sidebar } from "./Sidebar.jsx";

export function Layout({ children }) {
    return (
        <div style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            minHeight: "100vh",
        }}>
            <Sidebar />
            <main style={{ overflow: "auto", backgroundColor: "var(--back-color)" }}>
                {children}
            </main>
        </div>
    );
}
