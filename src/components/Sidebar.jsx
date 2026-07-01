import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext.jsx";

const allNavItems = [
    {
        label: "ダッシュボード",
        path: "/",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
                <path d="M240-200h120v-240h240v240h120v-360L480-740 240-560v360Zm-80 80v-480l320-240 320 240v480H520v-240h-80v240H160Zm320-350Z"/>
            </svg>
        ),
    },
    {
        label: "出席",
        path: "/teacher/take-attendance",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
                <path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-132 77-237.5T360-862v86q-91 37-145.5 117.5T160-480q0 134 93 227t227 93q134 0 227-93t93-227q0-98-54.5-178.5T600-776v-86q126 39 203 144.5T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-240L280-520l56-56 104 103v-407h80v407l104-103 56 56-200 200Z"/>
            </svg>
        ),
    },
    {
        label: "メッセージ",
        path: "/messages",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
                <path d="M240-400h320v-80H240v80Zm0-120h480v-80H240v80Zm0-120h480v-80H240v80ZM80-80v-720q0-33 23.5-56.5T160-880h640q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H240L80-80Zm80-80h640v-480H160v525l80-65Zm0 0v-480 480Z"/>
            </svg>
        ),
    },
    {
        label: "授業管理",
        path: "/teacher/manage-category",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
                <path d="M400-400h160v-80H400v80Zm0-120h320v-80H400v80Zm0-120h320v-80H400v80Zm-80 400q-33 0-56.5-23.5T240-320v-480q0-33 23.5-56.5T320-880h480q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H320Zm0-80h480v-480H320v480ZM160-80q-33 0-56.5-23.5T80-160v-560h80v560h560v80H160Zm160-720v480-480Z"/>
            </svg>
        ),
    },
    {
        label: "学生管理",
        path: "/teacher/manage-student",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
                <path d="M234-276q51-39 114-61.5T480-360q69 0 132 22.5T726-276q35-41 54.5-93T800-480q0-133-93.5-226.5T480-800q-133 0-226.5 93.5T160-480q0 59 19.5 111t54.5 93Zm246-164q-59 0-99.5-40.5T340-580q0-59 40.5-99.5T480-720q59 0 99.5 40.5T620-580q0 59-40.5 99.5T480-440Zm0 360q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z"/>
            </svg>
        ),
    },
    {
        label: "教員管理",
        path: "/admin/teachers",
        adminOnly: true,
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
                <path d="M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v112H160Zm80-80h480v-32q0-11-5.5-20T700-306q-54-27-109-40.5T480-360q-56 0-111 13.5T260-306q-9 5-14.5 14t-5.5 20v32Zm240-320q33 0 56.5-23.5T560-640q0-33-23.5-56.5T480-720q-33 0-56.5 23.5T400-640q0 33 23.5 56.5T480-560Zm0-80Zm0 400Z"/>
            </svg>
        ),
    },
];

export function Sidebar() {
    const [collapsed, setCollapsed] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { profile, isAdmin, signOut } = useAuth();

    const navItems = allNavItems.filter((item) => !item.adminOnly || isAdmin);

    return (
        <nav id="sidebar" className={collapsed ? "close" : ""}>
            <ul>
                <li>
                    <span className="logo"><p>読売理工医療福祉専門学校</p></span>
                    <button
                        id="toggle-btn"
                        className={collapsed ? "rotate" : ""}
                        onClick={() => setCollapsed(prev => !prev)}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px">
                            <path d="M600-120q-33 0-56.5-23.5T520-200v-560q0-33 23.5-56.5T600-840h160q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H600Zm-400 0q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h160q33 0 56.5 23.5T440-760v560q0 33-23.5 56.5T360-120H200Zm0-640v560h160v-560H200Z"/>
                        </svg>
                    </button>
                </li>

                {navItems.map((item) => (
                    <li key={item.path} className={location.pathname === item.path ? "active" : ""}>
                        <a
                            href="#"
                            onClick={(e) => {
                                e.preventDefault();
                                navigate(item.path);
                            }}
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </a>
                    </li>
                ))}

                <li className="sidebar-footer">
                    <div className="sidebar-user">
                        <span>{profile?.name}</span>
                        <small>
                            {isAdmin
                                ? "管理者"
                                : profile?.username
                                    ? `@${profile.username}`
                                    : "教員"}
                        </small>
                    </div>
                    <button className="sidebar-logout" onClick={signOut}>
                        ログアウト
                    </button>
                </li>
            </ul>
        </nav>
    );
}
