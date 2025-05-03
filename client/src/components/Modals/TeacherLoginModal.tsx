import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { soundService } from '@/lib/soundService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TeacherLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TEACHER_PASSWORD = '11223344';

export default function TeacherLoginModal({ isOpen, onClose }: TeacherLoginModalProps) {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = () => {
    setIsLoading(true);
    setError('');
    
    // تأخير صناعي لمحاكاة التحقق
    setTimeout(() => {
      if (password === TEACHER_PASSWORD) {
        soundService.play('correct');
        toast({
          title: "تم تسجيل الدخول بنجاح",
          description: "مرحباً بك في لوحة تحكم المعلمة",
        });
        onClose();
        navigate('/teacher');
      } else {
        soundService.play('wrong');
        setError('كلمة المرور غير صحيحة');
        toast({
          title: "خطأ في تسجيل الدخول",
          description: "كلمة المرور غير صحيحة",
          variant: "destructive"
        });
      }
      setIsLoading(false);
    }, 500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">تسجيل دخول المعلمة</DialogTitle>
          <DialogDescription className="text-center">
            يرجى إدخال كلمة المرور للوصول إلى لوحة تحكم المعلمة
          </DialogDescription>
        </DialogHeader>
        
        <div className="p-4 space-y-4">
          <div className="flex flex-col space-y-2">
            <label htmlFor="password">كلمة المرور</label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="أدخل كلمة المرور"
              className="text-center text-lg w-full"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleLogin();
                }
              }}
            />
          </div>
          
          {error && (
            <div className="text-red-500 text-sm text-center">
              {error}
            </div>
          )}
        </div>
        
        <DialogFooter>
          <div className="flex w-full gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                soundService.play('click');
                onClose();
              }}
            >
              إلغاء
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                soundService.play('click');
                handleLogin();
              }}
              disabled={isLoading || password.length === 0}
              style={{
                background: 'linear-gradient(45deg, #3b82f6, #1d4ed8)',
                border: '2px solid #60a5fa',
              }}
            >
              {isLoading ? 'جاري التحقق...' : 'تسجيل الدخول'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
