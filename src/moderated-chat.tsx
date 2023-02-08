import {
  ChannelList,
  Chat,
  MemberList,
  MessageInput,
  MessageList,
  TypingIndicator,
  useChannelMembers,
  usePresence,
  useUser,
  useUserMemberships,
  useUsers,
} from "@pubnub/react-chat-components";
import { PubNubProvider, usePubNub } from "pubnub-react";
import React, { useEffect, useState } from "react";
import { CreateChatModal } from "./components/create-chat-modal";
import "./moderated-chat.scss";

function PubNubChat() {
  const pubnub = usePubNub();
  const uuid = pubnub.getUUID();
  const [currentUser] = useUser({ uuid });
  const [currentChannel, setCurrentChannel] = useState({ id: "default" });
  const [showMembers, setShowMembers] = useState(false);
  const [showChannels, setShowChannels] = useState(true);
  const [showCreateChatModal, setShowCreateChatModal] = useState(false);
  const [channelsFilter, setChannelsFilter] = useState("");
  const [membersFilter, setMembersFilter] = useState("");
  const [joinedChannels, , refetchJoinedChannels] = useUserMemberships({
    include: { channelFields: true, customChannelFields: true },
  });
  const [allUsers] = useUsers({ include: { customFields: true } });
  const [loggedInUser, setLoggedInUser] = useState();

  const [channelMembers, , refetchChannelMemberships, totalChannelMembers] = useChannelMembers({
    channel: currentChannel.id,
    include: { customUUIDFields: true },
  });

  const [presenceData] = usePresence({
    channels: joinedChannels.length ? joinedChannels.map((c) => c.id) : [currentChannel.id],
  });

  const presentUUIDs = presenceData[currentChannel.id]?.occupants?.map((o) => o.uuid);

  const directChannels = joinedChannels
    .filter((c) => c.id?.startsWith("direct.") || c.id?.startsWith("group."))
    .map((c) => {
      if (!c.id?.startsWith("direct.")) return c;
      const interlocutorId = c.id.replace(uuid, "").replace("direct.", "").replace("@", "");
      const interlocutor = allUsers.find((u) => u.id === interlocutorId);
      if (interlocutor) {
        c.custom = { profileUrl: interlocutor.profileUrl || "" };
        c.name = interlocutor.name;
      }
      return c;
    })
    .filter((c) => c.name?.toLowerCase().includes(channelsFilter.toLowerCase()));

  const handleError = (e) => {
    if (
      (e.status?.operation === "PNPublishOperation" && e.status?.statusCode === 403) ||
      e.message.startsWith("Publish failed")
    ) {
      alert(
        "Your message was blocked. Perhaps you tried to use offensive language or send an image that contains nudity?"
      );
    }

    console.warn(e);
  };

  useEffect(() => {
    if (currentChannel.id === "default" && joinedChannels.length)
      setCurrentChannel(joinedChannels[0]);
  }, [currentChannel, joinedChannels]);

  const setAnotherCurrentChannel = (channelId) => {
    if (currentChannel.id === channelId) {
      const newCurrentChannel = joinedChannels?.find((ch) => ch.id !== channelId);
      if (newCurrentChannel) setCurrentChannel(newCurrentChannel);
    }
  };

  const leaveChannel = async (channel, event) => {
    event.stopPropagation();
    await pubnub.objects.removeMemberships({ channels: [channel.id] });
    refetchJoinedChannels();
    setAnotherCurrentChannel(channel.id);
  };

  // const handleDeleteMessage = async (message) => {
  //   try {
  //     pubnub.deleteMessages(
  //       {
  //         channel: message.channel,
  //         start: message.timetoken - 1,
  //         end: message.timetoken,
  //       },
  //       (result) => console.log(result, "1")
  //     );
  //     pubnub.deleteMessages(
  //       {
  //         channel: message.channel,
  //         start: message.timetoken,
  //         end: message.timetoken - 1,
  //       },
  //       (result) => console.log(result, "2")
  //     );
  //     pubnub.deleteMessages(
  //       {
  //         channel: message.channel,
  //       },
  //       (result) => console.log(result, 3)
  //     );
  //   } catch (status) {
  //     console.log(status);
  //   }
  // };

  return (
    <>
      <PubNubProvider client={pubnub}>
        <div className={`app-moderated app-moderated--${"light"}`}>
          <Chat
            theme={"light"}
            currentChannel={currentChannel.id}
            channels={[...joinedChannels.map((c) => c.id), uuid]}
            onError={handleError}
            users={allUsers}
          >
            {showCreateChatModal && (
              <CreateChatModal
                {...{
                  currentUser,
                  hideModal: () => setShowCreateChatModal(false),
                  setCurrentChannel,
                  users: entities?.data?.map((user, idx) => ({
                    id: user.userId._id,
                    name: user.name,
                    profileUrl: `https://randomuser.me/api/portraits/men/${idx}.jpg`,
                  })),
                  refetchJoinedChannels,
                }}
              />
            )}
            <>
              <div className={`channels-panel ${showChannels && "shown"}`}>
                <div className="user-info">
                  {loggedInUser && <MemberList members={[loggedInUser]} selfText="" />}
                  <button
                    className="mobile material-icons-outlined"
                    onClick={() => setShowChannels(false)}
                  ></button>
                </div>

                <div className="filter-input">
                  <input
                    onChange={(e) => setChannelsFilter(e.target.value)}
                    placeholder="Search in..."
                    type="text"
                    value={channelsFilter}
                  />
                  <i className="fa fa-search"></i>
                </div>

                <div className="channel-lists">
                  <h2>
                    Converations
                    <button
                      className="material-icons-outlined"
                      onClick={() => {
                        setShowCreateChatModal(true);
                      }}
                    ></button>
                  </h2>
                  <div>
                    <ChannelList
                      channels={directChannels}
                      onChannelSwitched={(channel) => {
                        setCurrentChannel(channel);
                      }}
                      extraActionsRenderer={(c) => (
                        <div
                          onClick={(e) => {
                            leaveChannel(c, e);
                          }}
                          title="Leave channel"
                        >
                          <i className="fa fa-sign-out" aria-hidden="true"></i>
                        </div>
                      )}
                    />
                  </div>
                </div>
              </div>

              <div className="chat-window">
                <div className="channel-info ">
                  <button
                    className="mobile material-icons-outlined"
                    onClick={() => setShowChannels(true)}
                  >
                    <i className="fa fa-bars" />
                  </button>
                  <span onClick={() => setShowMembers(!showMembers)}>
                    <strong className="flex items-center mb-2">
                      {currentChannel.name || currentChannel.id}
                    </strong>
                    <p>{totalChannelMembers} members</p>
                  </span>
                  <hr />
                </div>
                <>
                  <MessageList
                    fetchMessages={25}
                    // extraActionsRenderer={(message) => (
                    //   <div
                    //     onClick={() => handleDeleteMessage(message)}
                    //     title="Delete"
                    //   >
                    //     <MdDeleteOutline />
                    //   </div>
                    // )}
                  />
                  <TypingIndicator />
                  <hr />
                  <MessageInput typingIndicator fileUpload="image" senderInfo={true} />
                </>
              </div>

              <div className={`members-panel ${showMembers && "shown"}`}>
                <h2>
                  Members
                  <button
                    className="material-icons-outlined"
                    onClick={() => setShowMembers(false)}
                  ></button>
                </h2>
                <div className="filter-input">
                  <input
                    onChange={(e) => setMembersFilter(e.target.value)}
                    placeholder="Search in members"
                    type="text"
                    value={membersFilter}
                  />
                  <i className="fa fa-search"></i>
                </div>
                <MemberList
                  members={channelMembers.filter((c) =>
                    c.name?.toLowerCase().includes(membersFilter.toLowerCase())
                  )}
                  presentMembers={presentUUIDs}
                />
              </div>
            </>
          </Chat>
        </div>
      </PubNubProvider>
    </>
  );
}

export default PubNubChat;
