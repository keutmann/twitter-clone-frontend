import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import styled from "styled-components";
import ProfileFeed from "./ProfileFeed";
import CommentsFeed from "../Comment/CommentsFeed";

const Wrapper = styled.div`


.react-tabs {
  -webkit-tap-highlight-color: transparent;
}

.react-tabs__tab-list {
  border-bottom: 1px solid #aaa;
  margin: 0 0 10px;
  padding: 0;
}

.react-tabs__tab {
  display: inline-block;
  border: 1px solid transparent;
  border-bottom: none;
  bottom: -1px;
  position: relative;
  list-style: none;
  padding: 6px 12px;
  cursor: pointer;
}

.react-tabs__tab--selected {
  border-radius: 5px 5px 0 0;
  text-decoration: underline;
}

.react-tabs__tab--disabled {
  color: GrayText;
  cursor: default;
}

.react-tabs__tab:focus {
  box-shadow: 0 0 5px hsl(208, 99%, 50%);
  border-color: hsl(208, 99%, 50%);
  outline: none;
}

.react-tabs__tab:focus:after {
  content: "";
  position: absolute;
  height: 5px;
  left: -4px;
  right: -4px;
  bottom: -5px;
  
}

.react-tabs__tab-panel {
  display: none;
}

.react-tabs__tab-panel--selected {
  display: block;
}
`;

const ProfileTabs = ( {user} ) => (
  <Wrapper>
  <Tabs>
    <TabList>
      <Tab>Tweets</Tab>
      <Tab>Tweets and Replies</Tab>
    </TabList>

    <TabPanel>
      <ProfileFeed user={user} />
    </TabPanel>
    <TabPanel>
      <CommentsFeed user={user} />
    </TabPanel>
  </Tabs>
  </Wrapper>
);

export default ProfileTabs;