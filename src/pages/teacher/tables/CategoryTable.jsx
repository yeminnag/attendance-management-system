import { useAuth } from "@/context/AuthContext.jsx";

import { deleteSubject } from "@/utils/subjectFunctions.js";



export function CategoryTable({ fetchSubjects, fetchSubject, setEditSubject, isAdmin }) {

    const { canEditSubject } = useAuth();



    async function removeSubject(id) {

        const { error } = await deleteSubject(id);

        if (error) return alert(error.message);

        fetchSubjects();

    }



    return (

        <table className="subject table-layout">

            <thead>

                <tr>

                    <th>授業</th>

                    <th>科目</th>

                    <th>開始時</th>

                    <th>終了時</th>

                    <th>日程</th>

                    <th>受講生</th>

                    <th></th>

                </tr>

            </thead>

            <tbody>

                {fetchSubject.length === 0 ? (

                    <tr>

                        <td colSpan={7} className="empty-row">

                            該当する授業がありません

                        </td>

                    </tr>

                ) : (

                    fetchSubject.map((subject) => {

                        const canEdit = canEditSubject(subject.id);



                        return (

                            <tr key={subject.id}>

                                <td>{subject.name}</td>

                                <td>{subject.type}</td>

                                <td>{subject.start_time.slice(0, 5)}</td>

                                <td>{subject.end_time.slice(0, 5)}</td>

                                <td>{subject.days?.join("、") ?? ""}</td>

                                <td>{subject.student_subjects[0].count}</td>

                                <td>

                                    {canEdit ? (

                                        <div className="action-menu">

                                            <button className="three-dots-btn">

                                                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M240-400q-33 0-56.5-23.5T160-480q0-33 23.5-56.5T240-560q33 0 56.5 23.5T320-480q0 33-23.5 56.5T240-400Zm240 0q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm240 0q-33 0-56.5-23.5T640-480q0-33 23.5-56.5T720-560q33 0 56.5 23.5T800-480q0 33-23.5 56.5T720-400Z"/></svg>

                                            </button>

                                            <div className="action-tooltip">

                                                <button

                                                    className="tooltip-btn edit-btn"

                                                    onClick={() => setEditSubject(subject)}

                                                >

                                                    編集

                                                </button>

                                                {isAdmin && (

                                                    <button

                                                        className="tooltip-btn delete-btn"

                                                        onClick={() => removeSubject(subject.id)}

                                                    >

                                                        削除

                                                    </button>

                                                )}

                                            </div>

                                        </div>

                                    ) : (

                                        <span className="no-action">—</span>

                                    )}

                                </td>

                            </tr>

                        );

                    })

                )}

            </tbody>

        </table>

    );

}

