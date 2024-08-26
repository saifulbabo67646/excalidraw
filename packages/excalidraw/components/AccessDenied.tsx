import React from "react";
import "./AccessDenied.scss"; // Import the SCSS file

const AccessDenied: React.FC = () => {
  return (
    <div className="access-denied-body">
      <div className="access-denied-container">
        <h1 className="access-denied-heading">アクセスが拒否されました</h1>
        {/* <p className="access-denied-paragraph">
          あなたはこのページにアクセスする権限がありません。
        </p> */}
      </div>
    </div>
  );
};

export default AccessDenied;
