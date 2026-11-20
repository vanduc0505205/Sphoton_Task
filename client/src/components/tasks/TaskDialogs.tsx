import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { TaskDto, TaskPriority, TaskStatus } from '../../types/api.types';
import { toDateInputValue } from '../../lib/utils';
import { UpsertTaskPayload } from '../../lib/api';

const taskFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Tiêu đề công việc là bắt buộc')
    .max(200, 'Tiêu đề không vượt quá 200 ký tự'),
  description: z
    .string()
    .trim()
    .max(2000, 'Mô tả không vượt quá 2000 ký tự')
    .optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  dueDate: z.string().optional(),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

export function TaskFormModal({
  isOpen,
  onClose,
  initialTask,
  onSubmitTask,
  isSaving,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialTask: TaskDto | null;
  onSubmitTask: (payload: UpsertTaskPayload) => Promise<void>;
  isSaving: boolean;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    mode: 'onChange',
    defaultValues: {
      title: '',
      description: '',
      status: 'TODO',
      priority: 'MEDIUM',
      dueDate: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (initialTask) {
        reset({
          title: initialTask.title,
          description: initialTask.description ? initialTask.description : '',
          status: initialTask.status,
          priority: initialTask.priority,
          dueDate: toDateInputValue(initialTask.dueDate),
        });
      } else {
        reset({
          title: '',
          description: '',
          status: 'TODO',
          priority: 'MEDIUM',
          dueDate: '',
        });
      }
    }
  }, [isOpen, initialTask, reset]);

  const onFormSubmit = async (values: TaskFormValues) => {
    const dueDateIso =
      values.dueDate && values.dueDate.trim().length > 0
        ? new Date(`${values.dueDate}T23:59:59.000Z`).toISOString()
        : null;

    const descriptionVal =
      values.description && values.description.trim().length > 0
        ? values.description.trim()
        : null;

    await onSubmitTask({
      title: values.title,
      description: descriptionVal,
      status: values.status as TaskStatus,
      priority: values.priority as TaskPriority,
      dueDate: dueDateIso,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialTask ? 'Chỉnh sửa công việc' : 'Tạo công việc mới'}
      description={
        initialTask
          ? 'Cập nhật thông tin chi tiết, tiến độ hoặc hạn hoàn thành của công việc.'
          : 'Điền các thông tin bên dưới để thêm đầu việc mới vào danh sách của bạn.'
      }
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4" noValidate>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
            Tiêu đề công việc <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            placeholder="Ví dụ: Chuẩn bị báo cáo đánh giá nhân sự tháng 11"
            {...register('title')}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
          />
          {errors.title && (
            <p className="text-xs text-rose-500 mt-1">{errors.title.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
            Mô tả chi tiết
          </label>
          <textarea
            rows={3}
            placeholder="Ghi chú nội dung thực hiện, tài liệu đính kèm hoặc tiêu chí hoàn thành..."
            {...register('description')}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
          />
          {errors.description && (
            <p className="text-xs text-rose-500 mt-1">{errors.description.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
              Trạng thái
            </label>
            <select
              {...register('status')}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
            >
              <option value="TODO">Cần làm (To Do)</option>
              <option value="IN_PROGRESS">Đang thực hiện (In Progress)</option>
              <option value="DONE">Hoàn thành (Done)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
              Mức độ ưu tiên
            </label>
            <select
              {...register('priority')}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
            >
              <option value="LOW">Ưu tiên thấp</option>
              <option value="MEDIUM">Trung bình</option>
              <option value="HIGH">Ưu tiên cao</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
            Hạn hoàn thành (Due date)
          </label>
          <input
            type="date"
            {...register('dueDate')}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            {initialTask ? 'Lưu thay đổi' : 'Tạo công việc'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function DeleteTaskConfirmModal({
  task,
  onClose,
  onConfirm,
  isDeleting,
}: {
  task: TaskDto | null;
  onClose: () => void;
  onConfirm: (taskId: string) => Promise<void>;
  isDeleting: boolean;
}) {
  if (!task) {
    return null;
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Xác nhận xóa công việc"
      description="Hành động này không thể hoàn tác sau khi thực hiện."
    >
      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="text-sm text-slate-700 dark:text-slate-200">
            Bạn có chắc chắn muốn xóa công việc{' '}
            <strong className="font-semibold text-slate-900 dark:text-white">
              &ldquo;{task.title}&rdquo;
            </strong>{' '}
            không?
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Giữ lại
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => onConfirm(task.id)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60 transition-colors"
          >
            {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
            Xóa vĩnh viễn
          </button>
        </div>
      </div>
    </Modal>
  );
}
