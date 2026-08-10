import { useState } from "react";
function AssignmentCard(props) {
  const [completed, setCompleted] = useState(props.completed);
  return (
    <div>
      <h3>{props.title}</h3>

      <p>Reward: +{props.xp} XP</p>

      <p>Status: {completed ? "Complete" : "Not Complete"}</p>

      <p>Due Date: {props.due}</p>

      <button
       disabled={completed}
       onClick={() => {
          if (!completed) {
            setCompleted(true);
          props.onComplete(props.xp);
       }
       }}
      >
    {completed ? "Quest Complete" : "Complete Quest"}
    </button>
    </div>
  );
}

export default AssignmentCard;