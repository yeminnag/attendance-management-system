import { useState, useEffect } from "react";
import "@/styles/teacher/manage-category.css";
import { useAuth } from "@/context/AuthContext.jsx";
import { WEEKDAYS } from "@/utils/dateTimeFunctions.js";
import {
    fetchSubjectsWithCounts,
    filterSubjects,
} from "@/utils/subjectFunctions.js";
import { ManageCategoryHeader } from "./headers/ManageCategoryHeader.jsx";
import { AddCategoryPanel } from "./panels/AddCategoryPanel.jsx";
import { EditCategoryPanel } from "./panels/EditCategoryPanel.jsx";
import { CategoryTable } from "./tables/CategoryTable.jsx";

export function ManageCategory() {
    const { isAdmin } = useAuth();
    const [fetchSubject, setFetchSubject] = useState([]);
    const [editSubject, setEditSubject] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [nameFilter, setNameFilter] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [dayFilter, setDayFilter] = useState("all");

    useEffect(() => {
        loadSubjects();
    }, []);

    async function loadSubjects() {
        const { data, error } = await fetchSubjectsWithCounts();
        if (error) return alert(error.message);
        setFetchSubject(data);
    }

    const filteredSubjects = filterSubjects(fetchSubject, {
        nameFilter,
        typeFilter,
        dayFilter,
    });

    return (
        <>
            {isAdmin && (
                <AddCategoryPanel
                    showModal={showModal}
                    setShowModal={setShowModal}
                    fetchSubjects={loadSubjects}
                />
            )}
            <EditCategoryPanel
                fetchSubjects={loadSubjects}
                editSubject={editSubject}
                setEditSubject={setEditSubject}
            />

            <div className="manage-category">
                <ManageCategoryHeader
                    showModal={showModal}
                    setShowModal={setShowModal}
                    isAdmin={isAdmin}
                />
                <div className="subject-filter">
                    <div className="input-box">
                        <label htmlFor="subject-name-filter">授業名</label>
                        <input
                            id="subject-name-filter"
                            type="text"
                            className="input-field"
                            placeholder="検索..."
                            value={nameFilter}
                            onChange={(e) => setNameFilter(e.target.value)}
                        />
                    </div>
                    <div className="input-box">
                        <label htmlFor="subject-type-filter">科目</label>
                        <select
                            id="subject-type-filter"
                            className="input-field"
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                        >
                            <option value="all">すべて</option>
                            <option value="必修">必修</option>
                            <option value="選択">選択</option>
                        </select>
                    </div>
                    <div className="input-box">
                        <label htmlFor="subject-day-filter">日程</label>
                        <select
                            id="subject-day-filter"
                            className="input-field"
                            value={dayFilter}
                            onChange={(e) => setDayFilter(e.target.value)}
                        >
                            <option value="all">すべて</option>
                            {WEEKDAYS.map((day) => (
                                <option key={day} value={day}>
                                    {day}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <CategoryTable
                    fetchSubjects={loadSubjects}
                    fetchSubject={filteredSubjects}
                    setEditSubject={setEditSubject}
                    isAdmin={isAdmin}
                />
            </div>
        </>
    );
}
