import React from "react";
import type { Comment } from "../../App";
import { KEYS } from "../../../packages/excalidraw/keys";
import { CloseIcon } from "../../../packages/excalidraw/components/icons";
import { t } from "../../../packages/excalidraw/i18n";

type CommentThreadProps = {
  commentThread: any;
  style: React.CSSProperties | undefined;
  comment: Comment;
  setComment: (comment: Comment | null) => void;
  saveComment: () => void;
};

export const CommentCard = ({ data }: { data: any }) => {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          marginBottom: "8px",
          padding: "12px",
        }}
      >
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
        <div>
          <div
            style={{
              fontWeight: "500",
              color: "#38393C",
              fontSize: "12px",
              marginBottom: "4px",
            }}
          >
            {data.user?.name}
          </div>
        </div>
        <div>
          <div
            style={{
              color: "#98A1A9",
              fontWeight: "500",
              fontSize: "12px",
            }}
          >
            {new Date(data.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      </div>
      <div>
        <div
          style={{
            color: "#38393C",
            fontWeight: "500",
            marginTop: "4px",
          }}
        >
          {data.value}
        </div>
      </div>
    </div>
  );
};

const CommentThread = ({
  commentThread,
  style,
  comment,
  setComment,
  saveComment,
}: CommentThreadProps) => {
  const LineBreaker = ({
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
      <div style={{}}>
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
        <div style={{ marginTop: "12px" }}>
          <textarea
            className="comment"
            ref={(ref) => {
              setTimeout(() => ref?.focus());
            }}
            placeholder={comment.value ? "Reply" : "Comment"}
            value={comment.value}
            onChange={(event) => {
              setComment({ ...comment, value: event.target.value });
            }}
            // onBlur={saveComment} //@TODO: uncomment after development
            onKeyDown={(event) => {
              if (!event.shiftKey && event.key === KEYS.ENTER) {
                event.preventDefault();
                saveComment();
              }
            }}
            style={{
              width: "90%",
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #ddd",
              backgroundColor: "#f9f9f9",
              color: "#333",
              fontSize: "14px",
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default CommentThread;
