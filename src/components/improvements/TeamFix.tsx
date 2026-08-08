import React from 'react';
import '../../styles/improvements.css';
import { asset } from '../../utils/asset';

type TeamMemberProps = {
  src: string;
  alt?: string;
  name?: string;
  role?: string;
};

export const TeamMember: React.FC<TeamMemberProps> = ({ src, alt = '', name, role }) => {
  const safeSrc = encodeURI(asset(src));
  return (
    <figure className="im-team-card">
      <img className="im-team-image" src={safeSrc} alt={alt || name} />
      <figcaption className="im-team-caption">
        <strong>{name}</strong>
        {role && <span className="im-team-role">{role}</span>}
      </figcaption>
    </figure>
  );
};

export default TeamMember;
