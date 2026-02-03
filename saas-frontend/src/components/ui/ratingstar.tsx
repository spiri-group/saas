import { useState } from 'react';
import classNames from 'classnames';
import Star from '@/icons/Star';
import { IconStyle } from '@/icons/shared/types';

const RatingStarVisualizerComponent : React.FC<{ 
    className?: string, 
    starSize?: number, 
    readOnly?: boolean,
    onSelect?: (rating: number) => void,
    value?: number
}>  = (props) => {
          const [rating, _setRating] = useState(props.value ? props.value : null);
          const starSize = props.starSize != null ? props.starSize : 15

          const setRating = (rating: number) => {
              if (props.readOnly == null || !props.readOnly) {
              if (props.onSelect) props.onSelect(rating)
              _setRating(rating)
              }
          }

          const generateNumberSequence = (rating) => {
            const fullStars = Math.floor(rating);
            const hasHalfStar = rating % 1 !== 0;
          
            const numbers = [] as number[];
            for (let i = 1; i <= 5; i++) {
              if (i <= fullStars) {
                numbers.push(i);
              } else if (hasHalfStar && i === fullStars + 1) {
                numbers.push(rating);
              } else {
                numbers.push(i);
              }
            }
            return numbers;
          };
  
          const getStarIcon = (star: number, rating: number) => {
            return <Star
                      mode={IconStyle.Fill}
                      height={starSize}
                      selected={star <= rating}
                      onClick={() => setRating(star)}
                      />
          }
          const stars = generateNumberSequence(rating)

          return (
            <div>
              <div className={classNames("flex items-center", props.className)}>
                {stars.map((star) => getStarIcon(star, rating ?? 0))}
              </div>
            </div>
          )
}

export default RatingStarVisualizerComponent;
