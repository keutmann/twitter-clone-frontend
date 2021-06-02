import React, { useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { withRouter } from "react-router-dom";
import { toast } from "react-toastify";
import useInput from "../../hooks/useInput";
import Input, { Wrapper } from "../Input";
import Button from "../../styles/Button";
import Form from "../../styles/Form";
import { displayError } from "../../utils";
import CoverPhoto from "../../styles/CoverPhoto";
import AvatarIdenticon from "../AvatarIdenticon";
import { uploadImage } from "../../utils";
import useUser from "../../hooks/useUser";


const EditProfileForm = ({ history }) => {

  const { user } = useUser();

  const [avatarState, setAvatar] = useState("");
  const [coverPhotoState, setCoverPhoto] = useState("");

  const profile = user.profile;

  const displayname = useInput(profile.displayname);
  //const location = useInput(profile && profile.location);
  const website = useInput(profile.website);
  //const dob = useInput(profile && profile.dob);
  const avatar = useInput(profile.avatar);
  const bio = useInput(profile.bio);
  const coverPhoto = useInput(profile.coverPhoto || '/tropical_paradise_204378.jpg');

  const handle = user.id;


  const handleEditProfile = async (e) => {
    e.preventDefault();

    try {
      let formData ={
          displayname: displayname.value+'',
          bio: bio.value+'',
          website: website.value+'',
          avatar: avatarState ? avatarState : avatar.value,
          coverPhoto: coverPhotoState ? coverPhotoState : coverPhoto.value,
          location: '',
          dob : ''
      };

      // There may be no undefined properties in the object or it will not be saved to the gun graph
      formData.avatar = '';

      let updatedData = Object.assign(profile, formData);

      user.node.profile.put(updatedData);

      toast.success("Your profile has been updated 🥳");
    } catch (err) {
      return displayError(err);
    }

    [
      displayname,
      // dob,
      // location,
      website,
      avatar,
      coverPhoto,
    ].map((field) => field.setValue(""));

    history.push(`/${handle}`);
  };

  const handleCoverPhoto = async (e) => {
    setCoverPhoto(await uploadImage(e.target.files[0]));
  };

  const handleAvatar = async (e) => {
    setAvatar(await uploadImage(e.target.files[0]));
  };

  return (
    <Form lg onSubmit={handleEditProfile}>
      <Wrapper>
        <label>Cover Photo</label>
        <label htmlFor="cover-photo-input">
          <CoverPhoto
            src={coverPhotoState ? coverPhotoState : coverPhoto.value}
            alt="cover"
          />
        </label>
        <input type="file" id="cover-photo-input" accept="image/*" onChange={handleCoverPhoto} />
      </Wrapper>

      <Wrapper>
        <label>Avatar Photo</label>
        <label htmlFor="avatar-input-file">
          <AvatarIdenticon id={handle} profile={profile} />
          {/* <Avatar
            lg
            src={avatarState ? avatarState : avatar.value}
            alt="avatar"
          /> */}
        </label>
        <input type="file" accept="image/*" id="avatar-input-file" onChange={handleAvatar} />
      </Wrapper>

      <Input
        lg={true}
        text="Display Name"
        value={displayname.value}
        onChange={displayname.onChange}
      />
      <div className="bio-wrapper">
        <label className="bio" htmlFor="bio">
          Bio
        </label>
        <TextareaAutosize
          id="bio"
          placeholder="Write your bio here..."
          value={bio.value}
          onChange={bio.onChange}
        />
      </div>
      <Input
        lg={true}
        text="Website"
        value={website.value}
        onChange={website.onChange}
      />
      {/* <Input
        lg={true}
        text="Date of Birth"
        value={dob.value}
        onChange={dob.onChange}
      /> */}
      {/* <Input
        lg={true}
        text="Location"
        value={location.value}
        onChange={location.onChange}
      /> */}
      <Button outline type="submit">Save</Button>
    </Form>
  );
};

export default withRouter(EditProfileForm);
