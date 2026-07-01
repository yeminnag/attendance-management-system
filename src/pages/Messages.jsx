import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext.jsx";
import {
    buildConversationList,
    fetchAdminProfile,
    fetchMessagesWithPartner,
    fetchRecentMessages,
    fetchStudentContactsForTeacher,
    fetchStaffProfiles,
    markConversationRead,
    sendMessage,
    subscribeToMessages,
} from "@/utils/messageFunctions.js";
import "@/styles/chat.css";

function formatMessageTime(value) {
    if (!value) return "";
    const date = new Date(value);
    return date.toLocaleString("ja-JP", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function roleLabel(role) {
    if (role === "admin") return "管理者";
    if (role === "teacher") return "教員";
    if (role === "student") return "学生";
    return role;
}

export function Messages() {
    const { user, isAdmin, isTeacher } = useAuth();
    const [messages, setMessages] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [adminContact, setAdminContact] = useState(null);
    const [selectedPartnerId, setSelectedPartnerId] = useState(null);
    const [threadMessages, setThreadMessages] = useState([]);
    const [draft, setDraft] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const threadRef = useRef(null);

    const profilesById = useMemo(() => {
        const map = new Map(contacts.map((contact) => [contact.id, contact]));
        if (adminContact) map.set(adminContact.id, adminContact);
        return map;
    }, [contacts, adminContact]);

    const conversations = useMemo(
        () => buildConversationList(user?.id, messages, profilesById),
        [user?.id, messages, profilesById]
    );

    const selectedPartner = profilesById.get(selectedPartnerId) ?? null;

    useEffect(() => {
        if (!user?.id) return;

        async function loadContacts() {
            setLoading(true);

            if (isAdmin) {
                const { data } = await fetchStaffProfiles();
                setContacts((data ?? []).filter((row) => row.id !== user.id && row.role === "teacher"));
                setAdminContact(null);
            } else if (isTeacher) {
                const [{ data: adminProfile }, { data: studentContacts }] = await Promise.all([
                    fetchAdminProfile(),
                    fetchStudentContactsForTeacher(user.id),
                ]);

                setAdminContact(adminProfile ?? null);
                setContacts(studentContacts ?? []);
            }

            const { data: recentMessages } = await fetchRecentMessages(user.id);
            setMessages(recentMessages ?? []);
            setLoading(false);
        }

        loadContacts();
    }, [user?.id, isAdmin, isTeacher]);

    useEffect(() => {
        if (!user?.id || !selectedPartnerId) {
            setThreadMessages([]);
            return;
        }

        async function loadThread() {
            const { data, error } = await fetchMessagesWithPartner(user.id, selectedPartnerId);
            if (error) return;
            setThreadMessages(data ?? []);
            await markConversationRead(selectedPartnerId);
            setMessages((current) =>
                current.map((message) =>
                    message.recipient_id === user.id &&
                    message.sender_id === selectedPartnerId &&
                    !message.read_at
                        ? { ...message, read_at: new Date().toISOString() }
                        : message
                )
            );
        }

        loadThread();
    }, [user?.id, selectedPartnerId]);

    useEffect(() => {
        if (!user?.id) return undefined;

        return subscribeToMessages(user.id, () => {
            fetchRecentMessages(user.id).then(({ data }) => {
                if (data) setMessages(data);
            });
            if (selectedPartnerId) {
                fetchMessagesWithPartner(user.id, selectedPartnerId).then(({ data }) => {
                    if (data) setThreadMessages(data);
                });
                markConversationRead(selectedPartnerId);
            }
        });
    }, [user?.id, selectedPartnerId]);

    useEffect(() => {
        if (!threadRef.current) return;
        threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }, [threadMessages]);

    async function handleSend(event) {
        event.preventDefault();
        if (!selectedPartnerId || !draft.trim() || sending) return;

        setSending(true);
        const { data, error } = await sendMessage(selectedPartnerId, draft);
        setSending(false);

        if (error) {
            alert(error.message);
            return;
        }

        setDraft("");
        if (data) {
            setThreadMessages((current) => [...current, data]);
            setMessages((current) => [data, ...current]);
        }
    }

    function startConversation(partnerId) {
        setSelectedPartnerId(partnerId);
    }

    if (loading) {
        return <div className="chat-loading">読み込み中...</div>;
    }

    return (
        <div className="chat-page">
            <div className="chat-header">
                <div>
                    <h1>メッセージ</h1>
                    <p className="chat-subtitle">
                        {isAdmin
                            ? "教員と連絡できます"
                            : "担当学生と連絡できます"}
                    </p>
                </div>
            </div>

            <div className="chat-layout">
                <aside className="chat-sidebar">
                    <div className="chat-sidebar-section">
                        <h2>会話</h2>
                        {conversations.length === 0 ? (
                            <p className="chat-empty">会話はまだありません</p>
                        ) : (
                            conversations.map((conversation) => (
                                <button
                                    key={conversation.partnerId}
                                    type="button"
                                    className={`chat-contact${
                                        selectedPartnerId === conversation.partnerId ? " active" : ""
                                    }`}
                                    onClick={() => startConversation(conversation.partnerId)}
                                >
                                    <span className="chat-contact-name">
                                        {conversation.partner.name}
                                        {conversation.unreadCount > 0 && (
                                            <span className="chat-unread">{conversation.unreadCount}</span>
                                        )}
                                    </span>
                                    <span className="chat-contact-preview">
                                        {conversation.lastMessage.body}
                                    </span>
                                </button>
                            ))
                        )}
                    </div>

                    <div className="chat-sidebar-section">
                        <h2>{isAdmin ? "教員" : "学生"}</h2>
                        {contacts.length === 0 ? (
                            <p className="chat-empty">
                                {isAdmin ? "教員が見つかりません" : "担当学生が見つかりません"}
                            </p>
                        ) : (
                            contacts.map((contact) => (
                                <button
                                    key={contact.id}
                                    type="button"
                                    className={`chat-contact${
                                        selectedPartnerId === contact.id ? " active" : ""
                                    }`}
                                    onClick={() => startConversation(contact.id)}
                                >
                                    <span className="chat-contact-name">{contact.name}</span>
                                    <span className="chat-contact-role">
                                        {isAdmin
                                            ? roleLabel(contact.role)
                                            : contact.student_number
                                              ? `学籍番号 ${contact.student_number}`
                                              : "学生"}
                                    </span>
                                </button>
                            ))
                        )}
                    </div>

                    {isTeacher && adminContact && (
                        <div className="chat-sidebar-section">
                            <h2>管理者</h2>
                            <button
                                type="button"
                                className={`chat-contact${
                                    selectedPartnerId === adminContact.id ? " active" : ""
                                }`}
                                onClick={() => startConversation(adminContact.id)}
                            >
                                <span className="chat-contact-name">{adminContact.name}</span>
                                <span className="chat-contact-role">管理者</span>
                            </button>
                        </div>
                    )}
                </aside>

                <section className="chat-thread">
                    {!selectedPartner ? (
                        <div className="chat-placeholder">
                            連絡先を選んでメッセージを送ってください。
                        </div>
                    ) : (
                        <>
                            <div className="chat-thread-header">
                                <div>
                                    <strong>{selectedPartner.name}</strong>
                                    <span>{roleLabel(selectedPartner.role)}</span>
                                </div>
                            </div>

                            <div className="chat-messages" ref={threadRef}>
                                {threadMessages.length === 0 ? (
                                    <p className="chat-empty">まだメッセージはありません。</p>
                                ) : (
                                    threadMessages.map((message) => {
                                        const mine = message.sender_id === user.id;
                                        return (
                                            <div
                                                key={message.id}
                                                className={`chat-bubble-row${mine ? " mine" : ""}`}
                                            >
                                                <div className={`chat-bubble${mine ? " mine" : ""}`}>
                                                    <p>{message.body}</p>
                                                    <time>{formatMessageTime(message.created_at)}</time>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            <form className="chat-compose" onSubmit={handleSend}>
                                <textarea
                                    value={draft}
                                    onChange={(event) => setDraft(event.target.value)}
                                    placeholder={
                                        selectedPartner.role === "student"
                                            ? "例: 本日欠席します"
                                            : "メッセージを入力..."
                                    }
                                    rows={3}
                                />
                                <button type="submit" disabled={sending || !draft.trim()}>
                                    送信
                                </button>
                            </form>
                        </>
                    )}
                </section>
            </div>
        </div>
    );
}
