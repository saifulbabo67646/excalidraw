import React from "react";
import type { Comment } from "../../App";
import { KEYS } from "../../../packages/excalidraw/keys";
import {
  CloseIcon,
  SendIcon,
  ThreedotIcon,
} from "../../../packages/excalidraw/components/icons";
import { t } from "../../../packages/excalidraw/i18n";
import "./CommentThread.scss";

type CommentThreadProps = {
  commentThread: any;
  style: React.CSSProperties | undefined;
  comment: Comment;
  setComment: (comment: Comment | null) => void;
  saveComment: () => void;
};

export const CommentInput = ({
  comment,
  setComment,
  saveComment,
  onBlur,
}: {
  comment: Comment;
  setComment: (comment: Comment | null) => void;
  saveComment: () => void;
  onBlur?: () => void;
}) => {
  return (
    <div className="comment-input-container">
      <textarea
        className="comment-input"
        ref={(ref) => {
          setTimeout(() => ref?.focus());
        }}
        placeholder={comment.value ? "Reply" : "Add a comment"}
        value={comment.value}
        onChange={(event) => {
          setComment({ ...comment, value: event.target.value });
        }}
        onBlur={onBlur}
        onKeyDown={(event) => {
          if (!event.shiftKey && event.key === KEYS.ENTER) {
            event.preventDefault();
            saveComment();
          }
        }}
      />
      <button className="comment-send-button" onClick={saveComment}>
        <SendIcon />
      </button>
    </div>
  );
};

export const CommentCard = ({
  data,
  showLineBreak,
}: {
  data: any;
  showLineBreak?: boolean;
}) => {
  return (
    <div className="comment-card-wrapper">
      <div className="comment-card-header-wrapper">
        <div className="comment-card-header">
          <div style={{ marginRight: "8px" }}>
            <img
              src={data.user?.image || "https://via.placeholder.com/40"}
              alt="avatar"
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
              }}
            />
          </div>
          <div className="card-header-name">{data.user?.name}</div>
          <div className="card-header-date">
            {new Date(data.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
        <div className="threedot-icon-wrapper">
          <button className="comment-threedot-icon">
            <ThreedotIcon />
          </button>
        </div>
      </div>
      <div className="comment-value-wrapper">
        <p className="comment-value">{data.value}</p>
      </div>
      {showLineBreak && <LineBreaker />}
    </div>
  );
};

export const LineBreaker = ({
  style,
}: {
  style?: React.CSSProperties | undefined;
}) => {
  return (
    <div
      style={{
        ...style,
        borderBottom: "1px solid var(--Greyscale-200, #DCE0E3)",
      }}
    ></div>
  );
};

const CommentThread = ({
  commentThread,
  style,
  comment,
  setComment,
  saveComment,
}: CommentThreadProps) => {
  return (
    <div
      style={{
        ...style,
        position: "absolute",
        zIndex: 2,
        backgroundColor: "#fff",
        borderRadius: "20px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        color: "#333",
      }}
    >
      <div
        style={{
          height: "36px",
          display: "flex",
          justifyContent: "end",
          alignItems: "center",
        }}
      >
        <div
          onClick={() => setComment(null)}
          style={{ marginRight: "4px", height: "20px", width: "20px" }}
        >
          {CloseIcon}
        </div>
      </div>
      <LineBreaker />
      <div
        style={{ overflowY: "auto", maxHeight: "300px", marginBottom: "8px" }}
      >
        <CommentCard data={commentThread} />
        <LineBreaker />
        <div className="comment-thread">
          {commentThread.replies!?.length > 0 &&
            commentThread.replies!.map(
              (reply: Comment, index: React.Key | null | undefined) => (
                <div key={index}>
                  <CommentCard data={reply} />
                  <LineBreaker />
                </div>
              ),
            )}
        </div>
      </div>
      <CommentInput
        comment={comment}
        setComment={setComment}
        saveComment={saveComment}
      />
    </div>
  );
};

export default CommentThread;
