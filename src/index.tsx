import React from "react";
import ReactDOM from "react-dom/client";
import PubNub, { PubnubConfig } from "pubnub";
import { PubNubProvider } from "pubnub-react";
import users from "../../../../data/users/users.json";

import ModeratedChat from "./moderated-chat";
import "./index.css";

/**
 * Prepare a PubNub instance and inject it into PubNubProvider
 * You should generate your own keyset on pubnub.com and paste it into .env
 */

const hash = document.location.hash.split("?")[1];
const params = new URLSearchParams(hash);
const uuid = params.get("uuid");
const pubnubKeys = {
  publishKey: "pub-c-bfccc3c2-936a-4f7f-b19c-45541e91b89d",
  subscribeKey: "sub-c-f232375a-596f-4093-8211-79335bc9f038",
};
const pubnub = new PubNub({
  ...pubnubKeys,
  userId: "63e24a7a85a67d86c88cd59f",
  fileUploadPublishRetryLimit: 0,
} as PubnubConfig);

/** Detect PubNub access manager */
let pamEnabled = false;
pubnub.addListener({
  status: function (status) {
    if (status.category === "PNAccessDeniedCategory") {
      pamEnabled = true;
      renderApp();
    }
  },
});

const PamError = () => {
  return (
    <div className="pubnub-error">
      <h1>Warning! PubNub access manager enabled.</h1>
      <p>
        It looks like you have access manager enabled on your PubNub keyset. This sample app is not
        adapted to work with PAM by default.
      </p>
      <p>
        You can either disable PAM in the{" "}
        <a href="https://dashboard.pubnub.com/">PubNub Admin Portal</a> or add custom code to grant
        all necessary permissions by yourself. Please referer to the{" "}
        <a href="https://www.pubnub.com/docs/chat/components/react/access-manager">
          Chat Component docs
        </a>{" "}
        for more information.
      </p>
    </div>
  );
};

const KeysError = () => {
  return (
    <div className="pubnub-error">
      <h1>A PubNub account is required.</h1>
      <p>
        Visit the PubNub dashboard to create an account or login:
        <br />
        <a href="https://dashboard.pubnub.com/">https://dashboard.pubnub.com/</a>
        <br />
        Create a new app or locate your app in the dashboard. Enable the Presence, Files, Objects,
        and Storage features using a region of your choosing. For Objects, ensure the following are
        enabled:
      </p>
      <ul>
        <li>User Metadata Events</li>
        <li>Channel Metadata Events</li>
        <li>Membership Events</li>
      </ul>
      <p>Copy and paste your publish key and subscribe key into: </p>
      <pre>.env</pre>
      <p>before continuing.</p>
    </div>
  );
};

const renderApp = () => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      {pubnubKeys.publishKey?.length && pubnubKeys.subscribeKey?.length ? (
        pamEnabled ? (
          <PamError />
        ) : (
          <PubNubProvider client={pubnub}>
            <ModeratedChat />
          </PubNubProvider>
        )
      ) : (
        <KeysError />
      )}
    </React.StrictMode>
  );
};

renderApp();
