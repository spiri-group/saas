'use client';

import { FeedActivity } from '../../_hooks/useFollowingFeed';
import OracleCard from './OracleCard';
import VideoCard from './VideoCard';
import ServiceCard from './ServiceCard';
import ProductCard from './ProductCard';
import EventCard from './EventCard';
import GenericCard from './GenericCard';

type Props = {
    activity: FeedActivity;
    variant: 'snap' | 'grid';
};

export default function FeedActivityCard({ activity, variant }: Props) {
    const cardProps = { activity, variant };

    switch (activity.activityType) {
        case 'ORACLE_MESSAGE':
            return <OracleCard {...cardProps} />;
        case 'VIDEO_UPDATE':
            return <VideoCard {...cardProps} />;
        case 'NEW_SERVICE':
            return <ServiceCard {...cardProps} />;
        case 'NEW_PRODUCT':
            return <ProductCard {...cardProps} />;
        case 'NEW_EVENT':
            return <EventCard {...cardProps} />;
        default:
            return <GenericCard {...cardProps} />;
    }
}
