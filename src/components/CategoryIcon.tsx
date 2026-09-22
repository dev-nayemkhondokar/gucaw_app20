/**
 * Dynamic Icon Component mapping category string names to Lucide icons
 */
import React from 'react';
import {
  ShoppingCart,
  Home,
  Utensils,
  Car,
  HeartPulse,
  Smartphone,
  ShoppingBag,
  Users,
  Banknote,
  Briefcase,
  Laptop,
  TrendingUp,
  CreditCard,
  Wallet,
  ArrowRightLeft,
  HandCoins,
  ShieldCheck,
  Tag,
  Zap,
  GraduationCap,
  Film,
  Coffee,
  Gift,
  Sparkles,
  BookOpen,
  Receipt,
  Tv,
  Gamepad2,
  Dumbbell,
  Plane,
  LucideProps,
} from 'lucide-react';

interface CategoryIconProps extends LucideProps {
  name: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ name, ...props }) => {
  switch (name) {
    case 'ShoppingCart':
      return <ShoppingCart {...props} />;
    case 'Home':
      return <Home {...props} />;
    case 'Utensils':
      return <Utensils {...props} />;
    case 'Car':
      return <Car {...props} />;
    case 'HeartPulse':
      return <HeartPulse {...props} />;
    case 'Smartphone':
      return <Smartphone {...props} />;
    case 'ShoppingBag':
      return <ShoppingBag {...props} />;
    case 'Users':
      return <Users {...props} />;
    case 'Banknote':
      return <Banknote {...props} />;
    case 'Briefcase':
      return <Briefcase {...props} />;
    case 'Laptop':
      return <Laptop {...props} />;
    case 'TrendingUp':
      return <TrendingUp {...props} />;
    case 'CreditCard':
      return <CreditCard {...props} />;
    case 'Wallet':
      return <Wallet {...props} />;
    case 'ArrowRightLeft':
      return <ArrowRightLeft {...props} />;
    case 'HandCoins':
      return <HandCoins {...props} />;
    case 'ShieldCheck':
      return <ShieldCheck {...props} />;
    case 'Zap':
      return <Zap {...props} />;
    case 'GraduationCap':
      return <GraduationCap {...props} />;
    case 'Film':
      return <Film {...props} />;
    case 'Coffee':
      return <Coffee {...props} />;
    case 'Gift':
      return <Gift {...props} />;
    case 'Sparkles':
      return <Sparkles {...props} />;
    case 'BookOpen':
      return <BookOpen {...props} />;
    case 'Receipt':
      return <Receipt {...props} />;
    case 'Tv':
      return <Tv {...props} />;
    case 'Gamepad2':
      return <Gamepad2 {...props} />;
    case 'Dumbbell':
      return <Dumbbell {...props} />;
    case 'Plane':
      return <Plane {...props} />;
    default:
      return <Tag {...props} />;
  }
};
