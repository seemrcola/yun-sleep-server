import { Rule, RuleType } from '@midwayjs/validate';

export class CreateRoomDTO {
  @Rule(RuleType.string().required().min(3).max(20))
  name: string;

  @Rule(RuleType.string().required().min(1).max(100))
  description: string;

  @Rule(RuleType.number().required())
  capacity: number;
}
